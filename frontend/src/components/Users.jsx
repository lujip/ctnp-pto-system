import { useState, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineXMark, HiOutlineMagnifyingGlass, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi2';
import { USER_TYPES, normalizeUserType } from '../utils/userType';
import './Users.css';

const initialFormData = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  employee_id: '',
  user_type: USER_TYPES.EMPLOYEE,
  role: '',
  department: '',
  account_client: '',
  employment_type: 'Fixed',
  supervisor_id: '',
  manager_id: '',
  phone: '',
  address: '',
  status: 'ACTIVE',
  leave_balances: {
    Vacation: 15,
    Sick: 15,
    Emergency: 5
  }
};

const mapUserToEditForm = (user) => ({
  username: user.username || '',
  email: user.email || '',
  password: '',
  first_name: user.first_name || '',
  middle_name: user.middle_name || '',
  last_name: user.last_name || '',
  employee_id: user.employee_id || '',
  user_type: normalizeUserType(user.user_type),
  role: user.role || '',
  department: user.department || '',
  account_client: user.account_client || '',
  employment_type: user.employment_type || 'Fixed',
  supervisor_id: user.supervisor_id || '',
  manager_id: user.manager_id || '',
  phone: user.phone || '',
  address: user.address || '',
  status: user.status || 'ACTIVE',
  leave_balances: {
    Vacation: user.leave_balances?.Vacation ?? 15,
    Sick: user.leave_balances?.Sick ?? 15,
    Emergency: user.leave_balances?.Emergency ?? 5
  }
});

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [managers, setManagers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, userTypeFilter]);

  useEffect(() => {
    fetchSupervisorsAndManagers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchUsersByType = async (userType) => {
    const response = await fetch(
      `http://localhost:5000/api/users/?user_type=${userType}&limit=100`,
      { headers: getAuthHeaders() }
    );

    if (response.ok) {
      const data = await response.json();
      return data.users || [];
    }

    return [];
  };

  const fetchSupervisorsAndManagers = async () => {
    try {
      const [supervisorList, managerList] = await Promise.all([
        fetchUsersByType(USER_TYPES.SUPERVISOR),
        fetchUsersByType(USER_TYPES.MANAGER)
      ]);

      setSupervisors(supervisorList);
      setManagers(managerList);
    } catch (err) {
      console.error('Error fetching supervisors/managers:', err);
    }
  };

  const fetchUsers = async (pageOverride) => {
    try {
      setLoading(true);
      setError('');

      const page = pageOverride ?? pagination.page;

      const params = new URLSearchParams({
        page,
        limit: pagination.limit
      });

      if (search.trim()) params.append('search', search.trim());
      if (userTypeFilter) params.append('user_type', userTypeFilter);

      const response = await fetch(`http://localhost:5000/api/users/?${params}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1
        }));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers(1);
  };

  const handleOpenCreateModal = () => {
    setFormData(initialFormData);
    setFormError('');
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleUserClick = async (user) => {
    setShowDetailsModal(true);
    setSelectedUser(null);
    setDetailsError('');
    setDetailsLoading(true);
    setIsEditing(false);
    setEditFormData(initialFormData);

    try {
      const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data.user);
      } else {
        const data = await response.json();
        setDetailsError(data.message || 'Failed to load user details');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error fetching user details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
    setDetailsError('');
    setDetailsLoading(false);
    setDeleting(false);
    setIsEditing(false);
    setEditFormData(initialFormData);
    setUpdating(false);
  };

  const handleStartEdit = () => {
    if (!selectedUser) return;
    setEditFormData(mapUserToEditForm(selectedUser));
    setDetailsError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData(initialFormData);
    setDetailsError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
    setDetailsError('');
  };

  const handleLeaveBalanceChange = (leaveType, value) => {
    setEditFormData(prev => ({
      ...prev,
      leave_balances: {
        ...prev.leave_balances,
        [leaveType]: Number(value)
      }
    }));
    setDetailsError('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setUpdating(true);
    setDetailsError('');

    try {
      const payload = { ...editFormData };
      if (!payload.password) {
        delete payload.password;
      }
      if (!payload.supervisor_id) payload.supervisor_id = '';
      if (!payload.manager_id) payload.manager_id = '';

      const response = await fetch(`http://localhost:5000/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSelectedUser(data.user);
        setIsEditing(false);
        fetchUsers();
        fetchSupervisorsAndManagers();
      } else {
        setDetailsError(data.message || 'Failed to update user');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error updating user:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    const displayName = getDisplayName(selectedUser);
    if (!window.confirm(`Are you sure you want to delete ${displayName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setDetailsError('');

      const response = await fetch(`http://localhost:5000/api/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseDetailsModal();
        fetchUsers();
        fetchSupervisorsAndManagers();
      } else {
        setDetailsError(data.message || 'Failed to delete user');
      }
    } catch (err) {
      setDetailsError('Unable to connect to server');
      console.error('Error deleting user:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const payload = { ...formData };
      if (!payload.supervisor_id) delete payload.supervisor_id;
      if (!payload.manager_id) delete payload.manager_id;

      const response = await fetch('http://localhost:5000/api/users/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        handleCloseCreateModal();
        fetchUsers();
        fetchSupervisorsAndManagers();
      } else {
        setFormError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setFormError('Unable to connect to server');
      console.error('Error creating user:', err);
    } finally {
      setSubmitting(false);
    }
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

  const getUserNameById = (id, list) => {
    if (!id) return '—';
    const user = list.find((item) => item.id === id);
    return user ? getDisplayName(user) : '—';
  };

  const getUserTypeClass = (type) => normalizeUserType(type).toLowerCase();

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renderDetailItem = (label, value) => (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  );

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserType = normalizeUserType(currentUser.user_type);
  const isAdmin = currentUserType === USER_TYPES.ADMIN;
  const isCoo = currentUserType === USER_TYPES.COO;
  const canUpdateDeleteUser = isAdmin || isCoo;
  const isSelf = selectedUser?.id === currentUser.id;

  return (
    <div className="users-container">
      <div className="users-header">
        <div>
          <h2>Users</h2>
          <p>Manage employee accounts and access</p>
        </div>
        {isAdmin && (
          <button className="btn-create-user" onClick={handleOpenCreateModal}>
            <HiOutlinePlus />
            Create User
          </button>
        )}
      </div>

      <div className="users-toolbar">
        <form className="users-search" onSubmit={handleSearch}>
          <HiOutlineMagnifyingGlass className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-search">Search</button>
        </form>

        <select
          value={userTypeFilter}
          onChange={(e) => {
            setUserTypeFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        >
          <option value="">All Types</option>
          <option value={USER_TYPES.EMPLOYEE}>Employee</option>
          <option value={USER_TYPES.SUPERVISOR}>Supervisor</option>
          <option value={USER_TYPES.MANAGER}>Manager</option>
          <option value={USER_TYPES.ADMIN}>Admin</option>
          <option value={USER_TYPES.COO}>COO</option>
        </select>
      </div>

      {error && <div className="users-message error-message">{error}</div>}

      {loading ? (
        <div className="users-loading">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="users-empty">
          <h3>No Users Found</h3>
          <p>Create a new user to get started.</p>
        </div>
      ) : (
        <>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Employee ID</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="users-table-row-clickable"
                    onClick={() => handleUserClick(user)}
                  >
                    <td className="users-table-name">{getDisplayName(user)}</td>
                    <td>{user.username || '—'}</td>
                    <td>{user.email}</td>
                    <td>{user.employee_id || '—'}</td>
                    <td>
                      <span className={`type-badge ${getUserTypeClass(user.user_type)}`}>
                        {normalizeUserType(user.user_type)}
                      </span>
                    </td>
                    <td>{user.role || '—'}</td>
                    <td>{user.department || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="users-pagination">
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

      {showDetailsModal && (
        <div className="users-modal-overlay" onClick={handleCloseDetailsModal}>
          <div className="users-modal users-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h3>{isEditing ? 'Edit Employee' : 'Employee Details'}</h3>
              <button className="modal-close-btn" onClick={handleCloseDetailsModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <div className="users-details-content">
              {detailsLoading && (
                <div className="users-details-loading">Loading employee details...</div>
              )}

              {detailsError && (
                <div className="users-message error-message">{detailsError}</div>
              )}

              {selectedUser && !detailsLoading && !isEditing && (
                <>
                  <div className="details-header">
                    <h4>{getDisplayName(selectedUser)}</h4>
                    <span className={`type-badge ${getUserTypeClass(selectedUser.user_type)}`}>
                      {normalizeUserType(selectedUser.user_type)}
                    </span>
                  </div>

                  <div className="details-section">
                    <h5>Account Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Username', selectedUser.username)}
                      {renderDetailItem('Email', selectedUser.email)}
                      {renderDetailItem('Status', selectedUser.status)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Personal Information</h5>
                    <div className="details-grid">
                      {renderDetailItem('Full Name', selectedUser.full_name)}
                      {renderDetailItem('First Name', selectedUser.first_name)}
                      {renderDetailItem('Middle Name', selectedUser.middle_name)}
                      {renderDetailItem('Last Name', selectedUser.last_name)}
                      {renderDetailItem('Phone', selectedUser.phone)}
                      {renderDetailItem('Address', selectedUser.address)}
                    </div>
                  </div>

                  <div className="details-section">
                    <h5>Employment Details</h5>
                    <div className="details-grid">
                      {renderDetailItem('Employee ID', selectedUser.employee_id)}
                      {renderDetailItem('Role', selectedUser.role)}
                      {renderDetailItem('Department', selectedUser.department)}
                      {renderDetailItem('Account / Client', selectedUser.account_client)}
                      {renderDetailItem('Employment Type', selectedUser.employment_type)}
                      {renderDetailItem('Date Hired', formatDate(selectedUser.date_hired))}
                      {renderDetailItem('Supervisor', getUserNameById(selectedUser.supervisor_id, supervisors))}
                      {renderDetailItem('Manager', getUserNameById(selectedUser.manager_id, managers))}
                    </div>
                  </div>

                  {selectedUser.leave_balances && Object.keys(selectedUser.leave_balances).length > 0 && (
                    <div className="details-section">
                      <h5>Leave Balances</h5>
                      <div className="leave-balances-grid">
                        {Object.entries(selectedUser.leave_balances).map(([type, days]) => (
                          <div key={type} className="leave-balance-item">
                            <span className="leave-balance-type">{type}</span>
                            <span className="leave-balance-days">{days} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="details-section">
                    <h5>Activity</h5>
                    <div className="details-grid">
                      {renderDetailItem('Last Login', formatDateTime(selectedUser.last_login))}
                      {renderDetailItem('Created', formatDateTime(selectedUser.created_at))}
                      {renderDetailItem('Last Updated', formatDateTime(selectedUser.updated_at))}
                      {renderDetailItem('PTO Requests', selectedUser.pto_requests?.length || 0)}
                    </div>
                  </div>
                </>
              )}

              {selectedUser && !detailsLoading && isEditing && (
                <form onSubmit={handleUpdateUser} className="users-edit-form">
                  <div className="form-section">
                    <h4>Account Information</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_username">Username *</label>
                        <input
                          id="edit_username"
                          name="username"
                          value={editFormData.username}
                          onChange={handleEditFormChange}
                          required
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_email">Email *</label>
                        <input
                          id="edit_email"
                          name="email"
                          type="email"
                          value={editFormData.email}
                          onChange={handleEditFormChange}
                          required
                          disabled={updating}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit_password">New Password</label>
                      <input
                        id="edit_password"
                        name="password"
                        type="password"
                        value={editFormData.password}
                        onChange={handleEditFormChange}
                        placeholder="Leave blank to keep current password"
                        disabled={updating}
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Personal Information</h4>
                    <div className="form-row three-col">
                      <div className="form-group">
                        <label htmlFor="edit_first_name">First Name *</label>
                        <input
                          id="edit_first_name"
                          name="first_name"
                          value={editFormData.first_name}
                          onChange={handleEditFormChange}
                          required
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_middle_name">Middle Name</label>
                        <input
                          id="edit_middle_name"
                          name="middle_name"
                          value={editFormData.middle_name}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_last_name">Last Name *</label>
                        <input
                          id="edit_last_name"
                          name="last_name"
                          value={editFormData.last_name}
                          onChange={handleEditFormChange}
                          required
                          disabled={updating}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_phone">Phone</label>
                        <input
                          id="edit_phone"
                          name="phone"
                          value={editFormData.phone}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_address">Address</label>
                        <input
                          id="edit_address"
                          name="address"
                          value={editFormData.address}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Employment Details</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_employee_id">Employee ID</label>
                        <input
                          id="edit_employee_id"
                          name="employee_id"
                          value={editFormData.employee_id}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_user_type">User Type</label>
                        <select
                          id="edit_user_type"
                          name="user_type"
                          value={editFormData.user_type}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        >
                          <option value={USER_TYPES.EMPLOYEE}>Employee</option>
                          <option value={USER_TYPES.SUPERVISOR}>Supervisor</option>
                          <option value={USER_TYPES.MANAGER}>Manager</option>
                          <option value={USER_TYPES.ADMIN}>Admin</option>
                          <option value={USER_TYPES.COO}>COO</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_role">Role</label>
                        <input
                          id="edit_role"
                          name="role"
                          value={editFormData.role}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_department">Department</label>
                        <input
                          id="edit_department"
                          name="department"
                          value={editFormData.department}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_account_client">Account / Client</label>
                        <input
                          id="edit_account_client"
                          name="account_client"
                          value={editFormData.account_client}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_employment_type">Employment Type</label>
                        <select
                          id="edit_employment_type"
                          name="employment_type"
                          value={editFormData.employment_type}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        >
                          <option value="Fixed">Fixed</option>
                          <option value="Flexible">Flexible</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit_supervisor_id">Supervisor</label>
                        <select
                          id="edit_supervisor_id"
                          name="supervisor_id"
                          value={editFormData.supervisor_id}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        >
                          <option value="">Select Supervisor</option>
                          {supervisors.filter((s) => s.id !== selectedUser.id).map((supervisor) => (
                            <option key={supervisor.id} value={supervisor.id}>
                              {getDisplayName(supervisor)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit_manager_id">Manager</label>
                        <select
                          id="edit_manager_id"
                          name="manager_id"
                          value={editFormData.manager_id}
                          onChange={handleEditFormChange}
                          disabled={updating}
                        >
                          <option value="">Select Manager</option>
                          {managers.filter((m) => m.id !== selectedUser.id).map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {getDisplayName(manager)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit_status">Status</label>
                      <select
                        id="edit_status"
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditFormChange}
                        disabled={updating}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Leave Balances</h4>
                    <div className="form-row three-col">
                      {Object.entries(editFormData.leave_balances).map(([leaveType, days]) => (
                        <div className="form-group" key={leaveType}>
                          <label htmlFor={`edit_leave_${leaveType}`}>{leaveType}</label>
                          <input
                            id={`edit_leave_${leaveType}`}
                            type="number"
                            min="0"
                            value={days}
                            onChange={(e) => handleLeaveBalanceChange(leaveType, e.target.value)}
                            disabled={updating}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={updating}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={updating}>
                      {updating ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {canUpdateDeleteUser && selectedUser && !detailsLoading && !isEditing && (
              <div className="users-details-actions">
                <button
                  type="button"
                  className="btn-edit-user"
                  onClick={handleStartEdit}
                  disabled={deleting}
                >
                  <HiOutlinePencil />
                  Edit User
                </button>
                <button
                  type="button"
                  className="btn-delete-user"
                  onClick={handleDeleteUser}
                  disabled={deleting || isSelf}
                  title={isSelf ? 'You cannot delete your own account' : 'Delete user'}
                >
                  <HiOutlineTrash />
                  {deleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="users-modal-overlay" onClick={handleCloseCreateModal}>
          <div className="users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-header">
              <h3>Create User</h3>
              <button className="modal-close-btn" onClick={handleCloseCreateModal}>
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="users-form">
              {formError && (
                <div className="users-message error-message">{formError}</div>
              )}

              <div className="form-section">
                <h4>Account Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="username">Username *</label>
                    <input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleFormChange}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-section">
                <h4>Personal Information</h4>
                <div className="form-row three-col">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name *</label>
                    <input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleFormChange}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="middle_name">Middle Name</label>
                    <input
                      id="middle_name"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last Name *</label>
                    <input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleFormChange}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Employment Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="employee_id">Employee ID</label>
                    <input
                      id="employee_id"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="user_type">User Type</label>
                    <select
                      id="user_type"
                      name="user_type"
                      value={formData.user_type}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      <option value={USER_TYPES.EMPLOYEE}>Employee</option>
                      <option value={USER_TYPES.SUPERVISOR}>Supervisor</option>
                      <option value={USER_TYPES.MANAGER}>Manager</option>
                      <option value={USER_TYPES.ADMIN}>Admin</option>
                      <option value={USER_TYPES.COO}>COO</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <input
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleFormChange}
                      placeholder="e.g. Software Developer"
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="account_client">Account / Client</label>
                    <input
                      id="account_client"
                      name="account_client"
                      value={formData.account_client}
                      onChange={handleFormChange}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="employment_type">Employment Type</label>
                    <select
                      id="employment_type"
                      name="employment_type"
                      value={formData.employment_type}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      <option value="Fixed">Fixed</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="supervisor_id">Supervisor</label>
                    <select
                      id="supervisor_id"
                      name="supervisor_id"
                      value={formData.supervisor_id}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      <option value="">Select Supervisor</option>
                      {supervisors.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {getDisplayName(supervisor)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="manager_id">Manager</label>
                    <select
                      id="manager_id"
                      name="manager_id"
                      value={formData.manager_id}
                      onChange={handleFormChange}
                      disabled={submitting}
                    >
                      <option value="">Select Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {getDisplayName(manager)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    disabled={submitting}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseCreateModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
