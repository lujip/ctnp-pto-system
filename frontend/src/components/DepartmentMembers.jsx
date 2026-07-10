import { useState, useEffect } from 'react';
import {
  HiOutlineUserPlus,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineUserMinus
} from 'react-icons/hi2';
import { USER_TYPES, normalizeUserType } from '../utils/userType';
import './DepartmentMembers.css';

const DEPARTMENT_USER_TYPES = `${USER_TYPES.EMPLOYEE},${USER_TYPES.SUPERVISOR}`;

function DepartmentMembers() {
  const [departmentMembers, setDepartmentMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [assignMemberId, setAssignMemberId] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSearchLoading, setAssignSearchLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const managerId = currentUser.id;

  useEffect(() => {
    if (managerId) {
      fetchDepartmentMembers();
    }
  }, [pagination.page, managerId]);

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

  const getUserTypeClass = (type) => normalizeUserType(type).toLowerCase();

  const fetchDepartmentMembers = async (pageOverride) => {
    if (!managerId) {
      setError('Manager session not found. Please log in again.');
      setDepartmentMembers([]);
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
        manager_id: managerId,
        user_types: DEPARTMENT_USER_TYPES
      });

      if (search.trim()) params.append('search', search.trim());

      const response = await fetch(`http://localhost:5000/api/users/?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setDepartmentMembers(data.users || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1
        }));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to fetch department members');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching department members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMembers = async (searchTerm = assignSearch) => {
    try {
      setAssignSearchLoading(true);

      const params = new URLSearchParams({
        user_types: DEPARTMENT_USER_TYPES,
        limit: 100
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`http://localhost:5000/api/users/?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const teamIds = new Set(departmentMembers.map((member) => member.id));
        const candidates = (data.users || []).filter((user) => !teamIds.has(user.id));
        setAvailableMembers(candidates);
      } else {
        setAvailableMembers([]);
      }
    } catch (err) {
      console.error('Error fetching available members:', err);
      setAvailableMembers([]);
    } finally {
      setAssignSearchLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchDepartmentMembers(1);
  };

  const handleOpenAssignModal = async () => {
    setAssignMemberId('');
    setAssignSearch('');
    setAssignError('');
    setShowAssignModal(true);
    await fetchAvailableMembers('');
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssignMemberId('');
    setAssignSearch('');
    setAssignError('');
    setAvailableMembers([]);
  };

  const handleAssignSearch = async (e) => {
    e?.preventDefault?.();
    setAssignMemberId('');
    await fetchAvailableMembers(assignSearch);
  };

  const handleMemberClick = async (member) => {
    setShowDetailsModal(true);
    setSelectedMember(null);
    setDetailsError('');
    setDetailsLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/users/${member.id}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedMember(data.user);
      } else {
        const data = await response.json();
        setDetailsError(data.message || 'Failed to load member details');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error fetching member details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedMember(null);
    setDetailsError('');
    setDetailsLoading(false);
    setRemoving(false);
  };

  const handleAssignMember = async (e) => {
    e.preventDefault();

    if (!assignMemberId) {
      setAssignError('Please select a member');
      return;
    }

    try {
      setAssigning(true);
      setAssignError('');

      const response = await fetch(`http://localhost:5000/api/users/${assignMemberId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ manager_id: managerId })
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseAssignModal();
        fetchDepartmentMembers();
      } else {
        setAssignError(data.message || 'Failed to assign member');
      }
    } catch (err) {
      setAssignError('Unable to connect to server');
      console.error('Error assigning member:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveFromDepartment = async () => {
    if (!selectedMember) return;

    const displayName = getDisplayName(selectedMember);
    if (!window.confirm(`Remove ${displayName} from your department?`)) {
      return;
    }

    try {
      setRemoving(true);
      setDetailsError('');

      const response = await fetch(`http://localhost:5000/api/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ manager_id: '' })
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseDetailsModal();
        fetchDepartmentMembers();
      } else {
        setDetailsError(data.message || 'Failed to remove member from department');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error removing member from department:', err);
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
    <div className="department-members-container">
      <div className="department-members-header">
        <div>
          <h2>Department Team</h2>
          <p>View and manage employees and supervisors in your department</p>
        </div>
        <button className="btn-assign-member" onClick={handleOpenAssignModal}>
          <HiOutlineUserPlus />
          Assign Member
        </button>
      </div>

      <div className="department-members-toolbar">
        <form className="department-members-search" onSubmit={handleSearch}>
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">Search</button>
        </form>
      </div>

      {error && <div className="department-message error-message">{error}</div>}

      {loading ? (
        <div className="department-members-loading">Loading department members...</div>
      ) : departmentMembers.length === 0 ? (
        <div className="department-members-empty">
          <h3>No Department Members Yet</h3>
          <p>Assign employees and supervisors to build your department team.</p>
        </div>
      ) : (
        <>
          <div className="department-members-table-wrapper">
            <table className="department-members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {departmentMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="department-members-row-clickable"
                    onClick={() => handleMemberClick(member)}
                  >
                    <td className="department-member-name">{getDisplayName(member)}</td>
                    <td>{member.email}</td>
                    <td>{member.employee_id || '—'}</td>
                    <td>
                      <span className={`type-badge ${getUserTypeClass(member.user_type)}`}>
                        {normalizeUserType(member.user_type)}
                      </span>
                    </td>
                    <td>{member.role || '—'}</td>
                    <td>{member.department || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="department-members-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showAssignModal && (
        <div className="department-modal-overlay" onClick={handleCloseAssignModal}>
          <div className="department-modal" onClick={(e) => e.stopPropagation()}>
            <div className="department-modal-header">
              <h3>Assign Member to Department</h3>
              <button className="modal-close-btn" onClick={handleCloseAssignModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleAssignMember} className="department-form">
              {assignError && (
                <div className="department-message error-message">{assignError}</div>
              )}

              <div className="form-group">
                <label htmlFor="assign_member_search">Search Employees and Supervisors</label>
                <div className="assign-member-search">
                  <HiOutlineMagnifyingGlass className="search-icon" />
                  <input
                    id="assign_member_search"
                    type="text"
                    placeholder="Search by name, email, or employee ID..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAssignSearch(e);
                      }
                    }}
                    disabled={assigning}
                  />
                  <button
                    type="button"
                    className="btn-search"
                    onClick={handleAssignSearch}
                    disabled={assignSearchLoading || assigning}
                  >
                    {assignSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Select Member</label>
                <div className="assign-member-list">
                  {assignSearchLoading ? (
                    <p className="assign-help-text">Searching members...</p>
                  ) : availableMembers.length === 0 ? (
                    <p className="assign-help-text">No employees or supervisors found.</p>
                  ) : (
                    availableMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className={`assign-member-option ${assignMemberId === member.id ? 'selected' : ''}`}
                        onClick={() => {
                          setAssignMemberId(member.id);
                          setAssignError('');
                        }}
                        disabled={assigning}
                      >
                        <span className="assign-member-option-name">{getDisplayName(member)}</span>
                        <span className={`type-badge ${getUserTypeClass(member.user_type)}`}>
                          {normalizeUserType(member.user_type)}
                        </span>
                        <span className="assign-member-option-meta">
                          {member.employee_id ? `${member.employee_id} · ` : ''}{member.email}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseAssignModal} disabled={assigning}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={assigning || !assignMemberId}>
                  {assigning ? 'Assigning...' : 'Assign to Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && (
        <div className="department-modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="department-modal department-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="department-modal-header">
              <h3>Member Details</h3>
              <button className="modal-close-btn" onClick={handleCloseDetailsModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <div className="department-details-content">
              {detailsLoading && (
                <div className="department-details-loading">Loading member details...</div>
              )}

              {detailsError && (
                <div className="department-message error-message">{detailsError}</div>
              )}

              {selectedMember && !detailsLoading && (
                <>
                  <div className="details-header">
                    <h4>{getDisplayName(selectedMember)}</h4>
                    <span className={`type-badge ${getUserTypeClass(selectedMember.user_type)}`}>
                      {normalizeUserType(selectedMember.user_type)}
                    </span>
                  </div>

                  <div className="details-section">
                    <h5>Account Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Username', selectedMember.username)}
                      {renderDetailItem('Email', selectedMember.email)}
                      {renderDetailItem('Status', selectedMember.status)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Personal Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Full Name', selectedMember.full_name)}
                      {renderDetailItem('Phone', selectedMember.phone)}
                      {renderDetailItem('Address', selectedMember.address)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Employment Details</h5>
                    <div className="details-grid">
                      {renderDetailItem('Employee ID', selectedMember.employee_id)}
                      {renderDetailItem('Role', selectedMember.role)}
                      {renderDetailItem('Department', selectedMember.department)}
                      {renderDetailItem('Account / Client', selectedMember.account_client)}
                      {renderDetailItem('Employment Type', selectedMember.employment_type)}
                      {renderDetailItem('Date Hired', formatDate(selectedMember.date_hired))}
                    </div>
                  </div>

                  {selectedMember.leave_balances && Object.keys(selectedMember.leave_balances).length > 0 && (
                    <div className="details-section">
                      <h5>Leave Balances</h5>
                      <div className="leave-balances-grid">
                        {Object.entries(selectedMember.leave_balances).map(([type, days]) => (
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

            {selectedMember && !detailsLoading && (
              <div className="department-details-actions">
                <button
                  type="button"
                  className="btn-remove-member"
                  onClick={handleRemoveFromDepartment}
                  disabled={removing}
                >
                  <HiOutlineUserMinus />
                  {removing ? 'Removing...' : 'Remove from Department'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentMembers;
