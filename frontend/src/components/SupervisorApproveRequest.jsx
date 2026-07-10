import { useState, useEffect } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUser,
  HiOutlineXMark
} from 'react-icons/hi2';
import { USER_TYPES } from '../utils/userType';
import './SupervisorApproveRequest.css';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' }
];

function SupervisorApproveRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectComments, setRejectComments] = useState('');
  const [rejectError, setRejectError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const supervisorId = currentUser.id;

  useEffect(() => {
    if (supervisorId) {
      fetchTeamRequests();
    }
  }, [supervisorId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchTeamRequests = async () => {
    if (!supervisorId) {
      setError('Supervisor session not found. Please log in again.');
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const teamParams = new URLSearchParams({
        user_type: USER_TYPES.EMPLOYEE,
        supervisor_id: supervisorId,
        limit: 100
      });

      const teamResponse = await fetch(`http://localhost:5000/api/users/?${teamParams}`, {
        headers: getAuthHeaders()
      });

      if (!teamResponse.ok) {
        const data = await teamResponse.json();
        setError(data.message || 'Failed to fetch team members');
        setRequests([]);
        return;
      }

      const teamData = await teamResponse.json();
      const teamMemberIds = new Set((teamData.users || []).map((member) => member.id));

      if (teamMemberIds.size === 0) {
        setRequests([]);
        return;
      }

      const requestsResponse = await fetch('http://localhost:5000/api/pto/requests?limit=100', {
        headers: getAuthHeaders()
      });

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        const teamRequests = (data.requests || []).filter((req) =>
          teamMemberIds.has(req.employee_id) || teamMemberIds.has(req.requester_id)
        );
        setRequests(teamRequests);
      } else {
        setError('Failed to fetch requests');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching team requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitStatusUpdate = async (requestId, action, comments = '') => {
    try {
      setActionId(requestId);
      setActionType(action);

      const response = await fetch(`http://localhost:5000/api/pto/requests/${requestId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, comments })
      });

      const data = await response.json();

      if (response.ok) {
        setRequests((prev) =>
          prev.map((req) => (req.id === requestId ? data.request : req))
        );
        return true;
      }

      const message = data.message || `Failed to ${action.toLowerCase()} request`;
      if (action === 'REJECT') {
        setRejectError(message);
      } else {
        alert(message);
      }
      return false;
    } catch (err) {
      const message = `Unable to ${action.toLowerCase()} request. Please try again.`;
      if (action === 'REJECT') {
        setRejectError(message);
      } else {
        alert(message);
      }
      console.error(`Error ${action.toLowerCase()}ing request:`, err);
      return false;
    } finally {
      setActionId(null);
      setActionType('');
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this request?')) {
      return;
    }

    await submitStatusUpdate(requestId, 'APPROVE');
  };

  const handleOpenRejectModal = (request) => {
    setRejectTarget(request);
    setRejectComments('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleCloseRejectModal = () => {
    if (actionId) return;
    setShowRejectModal(false);
    setRejectTarget(null);
    setRejectComments('');
    setRejectError('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;

    setRejectError('');
    const success = await submitStatusUpdate(rejectTarget.id, 'REJECT', rejectComments.trim());

    if (success) {
      setShowRejectModal(false);
      setRejectTarget(null);
      setRejectComments('');
      setRejectError('');
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return <HiOutlineCheckCircle className="status-icon approved" />;
      case 'REJECTED':
        return <HiOutlineXCircle className="status-icon rejected" />;
      case 'PENDING':
        return <HiOutlineClock className="status-icon pending" />;
      default:
        return <HiOutlineClock className="status-icon" />;
    }
  };

  const getStatusClass = (status) => {
    return status.toLowerCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate, endDate) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getApprovalStatusBadge = (approvalStatus) => {
    if (!approvalStatus) return null;

    return (
      <div className="approval-badges">
        <span className={`approval-badge supervisor ${approvalStatus.supervisor?.toLowerCase()}`}>
          Supervisor: {approvalStatus.supervisor || 'PENDING'}
        </span>
        <span className={`approval-badge manager ${approvalStatus.manager?.toLowerCase()}`}>
          Manager: {approvalStatus.manager || 'PENDING'}
        </span>
        <span className={`approval-badge admin ${approvalStatus.admin?.toLowerCase()}`}>
          Admin: {approvalStatus.admin || 'PENDING'}
        </span>
        <span className={`approval-badge coo ${approvalStatus.coo?.toLowerCase()}`}>
          COO: {approvalStatus.coo || 'PENDING'}
        </span>
      </div>
    );
  };

  const canSupervisorAct = (request) =>
    request.status === 'PENDING' &&
    request.approval_status?.supervisor === 'PENDING';

  const isActionLoading = (requestId, action) =>
    actionId === requestId && actionType === action;

  const isSupervisorApproved = (request) => Boolean(request.approved_by_supervisor);

  const matchesTab = (request, tab) => {
    switch (tab) {
      case 'APPROVED':
        return isSupervisorApproved(request);
      case 'REJECTED':
        return request.status?.toUpperCase() === 'REJECTED';
      case 'PENDING':
      default:
        return (
          request.status?.toUpperCase() === 'PENDING' &&
          !isSupervisorApproved(request)
        );
    }
  };

  const getStatusCount = (tab) =>
    requests.filter((req) => matchesTab(req, tab)).length;

  const filteredRequests = requests.filter((req) => matchesTab(req, activeTab));

  const getEmptyTabMessage = () => {
    switch (activeTab) {
      case 'APPROVED':
        return 'No PTO requests approved by you yet.';
      case 'REJECTED':
        return 'No rejected PTO requests from your team.';
      default:
        return 'No pending PTO requests from your team.';
    }
  };

  const renderRequestCard = (request) => (
    <div key={request.id} className={`request-card ${getStatusClass(request.status)}`}>
      <div className="request-card-header">
        <div className="request-type-status">
          <span className="leave-type-badge">{request.leave_type}</span>
          <div className="status-container">
            {getStatusIcon(request.status)}
            <span className={`status-text ${getStatusClass(request.status)}`}>
              {request.status}
            </span>
          </div>
        </div>
        {canSupervisorAct(request) && (
          <div className="approval-actions">
            <button
              className="approve-btn"
              onClick={() => handleApprove(request.id)}
              disabled={actionId === request.id}
            >
              <HiOutlineCheckCircle />
              {isActionLoading(request.id, 'APPROVE') ? 'Approving...' : 'Approve'}
            </button>
            <button
              className="reject-btn"
              onClick={() => handleOpenRejectModal(request)}
              disabled={actionId === request.id}
            >
              <HiOutlineXCircle />
              {isActionLoading(request.id, 'REJECT') ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        )}
      </div>

      <div className="request-card-body">
        <div className="requester-info">
          <HiOutlineUser className="requester-icon" />
          <div className="requester-details">
            <span className="info-label">Requester</span>
            <span className="requester-name">
              {request.requester_name || 'Unknown Employee'}
            </span>
            {request.department && (
              <span className="requester-department">{request.department}</span>
            )}
          </div>
        </div>

        <div className="request-info-row">
          <div className="info-item">
            <span className="info-label">Date Range:</span>
            <span className="info-value">{formatDateRange(request.start_date, request.end_date)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Days:</span>
            <span className="info-value">{request.total_days} {request.total_days === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        {request.reason && (
          <div className="request-reason">
            <span className="info-label">Reason:</span>
            <p className="reason-text">{request.reason}</p>
          </div>
        )}

        <div className="request-dates-container">
          <span className="info-label">Selected Dates:</span>
          <div className="selected-dates-compact">
            {request.leave_dates && request.leave_dates.length > 0 ? (
              request.leave_dates.slice(0, 5).map((date, index) => (
                <span key={index} className="date-badge-small">
                  {formatDate(date)}
                </span>
              ))
            ) : (
              <span className="date-badge-small">
                {formatDateRange(request.start_date, request.end_date)}
              </span>
            )}
            {request.leave_dates && request.leave_dates.length > 5 && (
              <span className="date-badge-small more">
                +{request.leave_dates.length - 5} more
              </span>
            )}
          </div>
        </div>

        {request.approval_status && (
          getApprovalStatusBadge(request.approval_status)
        )}

        <div className="request-footer">
          <span className="submitted-date">
            Submitted: {formatDate(request.submitted_date)}
          </span>
          {request.rejection_reason && (
            <span className="rejection-reason">
              Rejection Reason: {request.rejection_reason}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="supervisor-approve-container">
        <div className="loading-state">
          <p>Loading team requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="supervisor-approve-container">
      <div className="supervisor-approve-header">
        <h2>Approve Requests</h2>
        <p>Review and approve PTO requests from your team members</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="status-tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`status-tab ${tab.key.toLowerCase()} ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="tab-count">{getStatusCount(tab.key)}</span>
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <HiOutlineCalendar className="empty-icon" />
          <h3>No Team Requests</h3>
          <p>No PTO requests from employees assigned to you.</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <HiOutlineCalendar className="empty-icon" />
          <h3>No {STATUS_TABS.find((t) => t.key === activeTab)?.label} Requests</h3>
          <p>{getEmptyTabMessage()}</p>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map(renderRequestCard)}
        </div>
      )}

      {showRejectModal && rejectTarget && (
        <div className="reject-modal-overlay" onClick={handleCloseRejectModal}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reject-modal-header">
              <h3>Reject Request</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseRejectModal}
                disabled={Boolean(actionId)}
              >
                <HiOutlineXMark />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="reject-modal-form">
              <p className="reject-modal-subtitle">
                Rejecting request from{' '}
                <strong>{rejectTarget.requester_name || 'Unknown Employee'}</strong>
                {' '}({rejectTarget.leave_type})
              </p>

              {rejectError && (
                <div className="reject-modal-error">{rejectError}</div>
              )}

              <div className="form-group">
                <label htmlFor="reject_comments">Reason for rejection (optional)</label>
                <textarea
                  id="reject_comments"
                  value={rejectComments}
                  onChange={(e) => setRejectComments(e.target.value)}
                  placeholder="Provide a reason for rejecting this request..."
                  rows={4}
                  disabled={Boolean(actionId)}
                />
              </div>

              <div className="reject-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseRejectModal}
                  disabled={Boolean(actionId)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-reject-submit"
                  disabled={Boolean(actionId)}
                >
                  {isActionLoading(rejectTarget.id, 'REJECT') ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupervisorApproveRequest;
