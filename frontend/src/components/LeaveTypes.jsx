import { useEffect, useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineXMark } from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import './LeaveTypes.css';

const initialFormData = {
  name: '',
  code: '',
  description: '',
  default_days: 0,
  advance_notice_days: 0,
  color: '#667eea',
  status: 'ACTIVE',
};

function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/pto/leave-types`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leave_types || []);
      } else {
        setError('Failed to load leave types');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingType(null);
    setFormData(initialFormData);
    setFormError('');
    setShowCreateModal(true);
  };

  const openEditModal = (leaveType) => {
    setEditingType(leaveType);
    setFormData({
      name: leaveType.name || '',
      code: leaveType.code || '',
      description: leaveType.description || '',
      default_days: leaveType.default_days ?? 0,
      advance_notice_days: leaveType.advance_notice_days ?? 0,
      color: leaveType.color || '#667eea',
      status: leaveType.status || 'ACTIVE',
    });
    setFormError('');
    setShowCreateModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowCreateModal(false);
    setEditingType(null);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'default_days' || name === 'advance_notice_days'
        ? Number(value)
        : value,
    }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const payload = {
        ...formData,
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
      };

      const response = await fetch(
        editingType
          ? `${API_BASE_URL}/pto/leave-types/${editingType.id}`
          : `${API_BASE_URL}/pto/leave-types`,
        {
          method: editingType ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok) {
        closeModal();
        fetchLeaveTypes();
      } else {
        setFormError(data.message || 'Failed to save leave type');
      }
    } catch (err) {
      setFormError('Unable to save leave type. Please try again.');
      console.error('Error saving leave type:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (leaveType) => {
    if (!window.confirm(`Delete leave type "${leaveType.name}"?`)) {
      return;
    }

    try {
      setDeletingId(leaveType.id);
      const response = await fetch(`${API_BASE_URL}/pto/leave-types/${leaveType.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        setLeaveTypes((current) => current.filter((type) => type.id !== leaveType.id));
      } else {
        alert(data.message || 'Failed to delete leave type');
      }
    } catch (err) {
      alert('Unable to delete leave type. Please try again.');
      console.error('Error deleting leave type:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="leave-types-container">
        <div className="leave-types-loading">Loading leave types...</div>
      </div>
    );
  }

  return (
    <div className="leave-types-container">
      <div className="leave-types-header">
        <div>
          <h2>Leave Types</h2>
          <p>Manage leave categories and calendar colors</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          <HiOutlinePlus />
          Add Leave Type
        </button>
      </div>

      {error && <div className="leave-types-error">{error}</div>}

      <div className="leave-types-table-wrapper">
        <table className="leave-types-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Name</th>
              <th>Code</th>
              <th>Description</th>
              <th>Default Days</th>
              <th>Advance Notice</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaveTypes.length === 0 ? (
              <tr>
                <td colSpan="8" className="leave-types-empty">
                  No leave types found.
                </td>
              </tr>
            ) : (
              leaveTypes.map((leaveType) => (
                <tr key={leaveType.id}>
                  <td>
                    <span
                      className="leave-type-color-swatch"
                      style={{ backgroundColor: leaveType.color || '#667eea' }}
                      title={leaveType.color || '#667eea'}
                    />
                  </td>
                  <td>{leaveType.name}</td>
                  <td>{leaveType.code || '—'}</td>
                  <td>{leaveType.description || '—'}</td>
                  <td>{leaveType.default_days}</td>
                  <td>{leaveType.advance_notice_days} days</td>
                  <td>
                    <span className={`leave-type-status ${leaveType.status?.toLowerCase()}`}>
                      {leaveType.status}
                    </span>
                  </td>
                  <td>
                    <div className="leave-type-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => openEditModal(leaveType)}
                        aria-label={`Edit ${leaveType.name}`}
                      >
                        <HiOutlinePencil />
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => handleDelete(leaveType)}
                        disabled={deletingId === leaveType.id}
                        aria-label={`Delete ${leaveType.name}`}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="leave-types-modal-overlay" onClick={closeModal}>
          <div
            className="leave-types-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="leave-types-modal-header">
              <h3>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</h3>
              <button type="button" className="btn-icon" onClick={closeModal} aria-label="Close">
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="leave-types-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="code">Code</label>
                  <input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="default_days">Default Days</label>
                  <input
                    id="default_days"
                    name="default_days"
                    type="number"
                    min="0"
                    value={formData.default_days}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="advance_notice_days">Advance Notice (days)</label>
                  <input
                    id="advance_notice_days"
                    name="advance_notice_days"
                    type="number"
                    min="0"
                    value={formData.advance_notice_days}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="color">Calendar Color</label>
                  <div className="color-input-row">
                    <input
                      id="color"
                      name="color"
                      type="color"
                      value={formData.color}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                    <input
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      disabled={submitting}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      placeholder="#667eea"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && <div className="leave-types-error">{formError}</div>}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingType ? 'Update Leave Type' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveTypes;
