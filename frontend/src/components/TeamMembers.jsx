import { useState, useEffect } from 'react';
import { HiOutlineUserPlus, HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineUserMinus } from 'react-icons/hi2';
import { USER_TYPES } from '../utils/userType';
import './TeamMembers.css';

function TeamMembers() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const supervisorId = currentUser.id;

  useEffect(() => {
    if (supervisorId) {
      fetchTeamMembers();
    }
  }, [pagination.page, supervisorId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const getDisplayName = (user) => {
    const fullName = user.full_name?.trim();
    if (fullName) return fullName;

    const composedName = [user.first_name, user.middle_name, user.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (composedName) return composedName;

    return user.username || user.email || 'Unknown User';
  };

  const fetchTeamMembers = async (pageOverride) => {
    if (!supervisorId) {
      setError('Supervisor session not found. Please log in again.');
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const page = pageOverride ?? pagination.page;
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        user_type: USER_TYPES.EMPLOYEE,
        supervisor_id: supervisorId
      });

      if (search.trim()) params.append('search', search.trim());

      const response = await fetch(`http://localhost:5000/api/users/?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.users || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1
        }));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to fetch team members');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEmployees = async () => {
    try {
      const params = new URLSearchParams({
        user_type: USER_TYPES.EMPLOYEE,
        unassigned: 'true',
        limit: 100
      });

      const response = await fetch(`http://localhost:5000/api/users/?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableEmployees(data.users || []);
      } else {
        setAvailableEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching available employees:', err);
      setAvailableEmployees([]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTeamMembers(1);
  };

  const handleOpenAssignModal = async () => {
    setAssignEmployeeId('');
    setAssignError('');
    setShowAssignModal(true);
    await fetchAvailableEmployees();
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssignEmployeeId('');
    setAssignError('');
  };

  const handleEmployeeClick = async (employee) => {
    setShowDetailsModal(true);
    setSelectedEmployee(null);
    setDetailsError('');
    setDetailsLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/users/${employee.id}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEmployee(data.user);
      } else {
        const data = await response.json();
        setDetailsError(data.message || 'Failed to load employee details');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error fetching employee details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEmployee(null);
    setDetailsError('');
    setDetailsLoading(false);
    setRemoving(false);
  };

  const handleAssignEmployee = async (e) => {
    e.preventDefault();

    if (!assignEmployeeId) {
      setAssignError('Please select an employee');
      return;
    }

    try {
      setAssigning(true);
      setAssignError('');

      const response = await fetch(`http://localhost:5000/api/users/${assignEmployeeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ supervisor_id: supervisorId })
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseAssignModal();
        fetchTeamMembers();
      } else {
        setAssignError(data.message || 'Failed to assign employee');
      }
    } catch (err) {
      setAssignError('Unable to connect to server');
      console.error('Error assigning employee:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveFromTeam = async () => {
    if (!selectedEmployee) return;

    const displayName = getDisplayName(selectedEmployee);
    if (!window.confirm(`Remove ${displayName} from your team?`)) {
      return;
    }

    try {
      setRemoving(true);
      setDetailsError('');

      const response = await fetch(`http://localhost:5000/api/users/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ supervisor_id: '' })
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseDetailsModal();
        fetchTeamMembers();
      } else {
        setDetailsError(data.message || 'Failed to remove employee from team');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error removing employee from team:', err);
    } finally {
      setRemoving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderDetailItem = (label, value) => (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  );

  return (
    <div className="team-members-container">
      <div className="team-members-header">
        <div>
          <h2>Team Members</h2>
          <p>View and manage employees assigned to you</p>
        </div>
        <button className="btn-assign-employee" onClick={handleOpenAssignModal}>
          <HiOutlineUserPlus />
          Assign Employee to Team
        </button>
      </div>

      <div className="team-members-toolbar">
        <form className="team-members-search" onSubmit={handleSearch}>
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            type="text"
            placeholder="Search team members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">Search</button>
        </form>
      </div>

      {error && <div className="team-message error-message">{error}</div>}

      {loading ? (
        <div className="team-members-loading">Loading team members...</div>
      ) : teamMembers.length === 0 ? (
        <div className="team-members-empty">
          <h3>No Team Members Yet</h3>
          <p>Assign employees to build your team.</p>
        </div>
      ) : (
        <>
          <div className="team-members-table-wrapper">
            <table className="team-members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="team-members-row-clickable"
                    onClick={() => handleEmployeeClick(member)}
                  >
                    <td className="team-member-name">{getDisplayName(member)}</td>
                    <td>{member.email}</td>
                    <td>{member.employee_id || '—'}</td>
                    <td>{member.role || '—'}</td>
                    <td>{member.department || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="team-members-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showAssignModal && (
        <div className="team-modal-overlay" onClick={handleCloseAssignModal}>
          <div className="team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="team-modal-header">
              <h3>Assign Employee to Team</h3>
              <button className="modal-close-btn" onClick={handleCloseAssignModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleAssignEmployee} className="team-form">
              {assignError && (
                <div className="team-message error-message">{assignError}</div>
              )}

              <div className="form-group">
                <label htmlFor="assign_employee">Select Employee</label>
                <select
                  id="assign_employee"
                  value={assignEmployeeId}
                  onChange={(e) => {
                    setAssignEmployeeId(e.target.value);
                    setAssignError('');
                  }}
                  disabled={assigning}
                  required
                >
                  <option value="">Choose an unassigned employee</option>
                  {availableEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {getDisplayName(employee)} {employee.employee_id ? `(${employee.employee_id})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {availableEmployees.length === 0 && (
                <p className="assign-help-text">No unassigned employees available.</p>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseAssignModal} disabled={assigning}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={assigning || availableEmployees.length === 0}>
                  {assigning ? 'Assigning...' : 'Assign to Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="team-modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="team-modal team-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="team-modal-header">
              <h3>Employee Details</h3>
              <button className="modal-close-btn" onClick={handleCloseDetailsModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <div className="team-details-content">
              {detailsLoading && (
                <div className="team-details-loading">Loading employee details...</div>
              )}

              {detailsError && (
                <div className="team-message error-message">{detailsError}</div>
              )}

              {selectedEmployee && !detailsLoading && (
                <>
                  <div className="details-header">
                    <h4>{getDisplayName(selectedEmployee)}</h4>
                  </div>

                  <div className="details-section">
                    <h5>Account Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Username', selectedEmployee.username)}
                      {renderDetailItem('Email', selectedEmployee.email)}
                      {renderDetailItem('Status', selectedEmployee.status)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Personal Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Full Name', selectedEmployee.full_name)}
                      {renderDetailItem('Phone', selectedEmployee.phone)}
                      {renderDetailItem('Address', selectedEmployee.address)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Employment Details</h5>
                    <div className="details-grid">
                      {renderDetailItem('Employee ID', selectedEmployee.employee_id)}
                      {renderDetailItem('Role', selectedEmployee.role)}
                      {renderDetailItem('Department', selectedEmployee.department)}
                      {renderDetailItem('Account / Client', selectedEmployee.account_client)}
                      {renderDetailItem('Employment Type', selectedEmployee.employment_type)}
                      {renderDetailItem('Date Hired', formatDate(selectedEmployee.date_hired))}
                    </div>
                  </div>

                  {selectedEmployee.leave_balances && Object.keys(selectedEmployee.leave_balances).length > 0 && (
                    <div className="details-section">
                      <h5>Leave Balances</h5>
                      <div className="leave-balances-grid">
                        {Object.entries(selectedEmployee.leave_balances).map(([type, days]) => (
                          <div key={type} className="leave-balance-item">
                            <span className="leave-balance-type">{type}</span>
                            <span className="leave-balance-days">{days} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedEmployee && !detailsLoading && (
              <div className="team-details-actions">
                <button
                  type="button"
                  className="btn-remove-employee"
                  onClick={handleRemoveFromTeam}
                  disabled={removing}
                >
                  <HiOutlineUserMinus />
                  {removing ? 'Removing...' : 'Remove from Team'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamMembers;
