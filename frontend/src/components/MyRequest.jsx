import { useState, useEffect } from 'react';
import { HiOutlineCalendar, HiOutlineTrash, HiOutlineClock, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import './MyRequest.css';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' }
];

function MyRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      if (!user?.id) {
        setError('User session not found. Please log in again.');
        setRequests([]);
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/pto/requests?employee_id=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const myRequests = (data.requests || []).filter(
          (req) => req.employee_id === user.id || req.requester_id === user.id
        );
        setRequests(myRequests);
      } else {
        setError('Failed to fetch requests');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      setDeletingId(requestId);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/pto/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setRequests(requests.filter(req => req.id !== requestId));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to cancel request');
      }
    } catch (err) {
      alert('Unable to cancel request. Please try again.');
      console.error('Error canceling request:', err);
    } finally {
      setDeletingId(null);
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

  const matchesTab = (request, tab) =>
    request.status?.toUpperCase() === tab;

  const getStatusCount = (tab) =>
    requests.filter((req) => matchesTab(req, tab)).length;

  const filteredRequests = requests.filter((req) => matchesTab(req, activeTab));

  const getEmptyTabMessage = () => {
    switch (activeTab) {
      case 'APPROVED':
        return 'You have no approved PTO requests.';
      case 'REJECTED':
        return 'You have no rejected PTO requests.';
      default:
        return 'You have no pending PTO requests.';
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
        {request.status === 'PENDING' && (
          <button
            className="cancel-btn"
            onClick={() => handleCancelRequest(request.id)}
            disabled={deletingId === request.id}
          >
            <HiOutlineTrash />
            {deletingId === request.id ? 'Canceling...' : 'Cancel'}
          </button>
        )}
      </div>

      <div className="request-card-body">
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
      <div className="my-request-container">
        <div className="loading-state">
          <p>Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-request-container">
      <div className="my-request-header">
        <h2>My Requests</h2>
        <p>View and manage your PTO requests</p>
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
          <h3>No Requests Yet</h3>
          <p>You haven't submitted any PTO requests. Click on "Request PTO" to create one.</p>
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
    </div>
  );
}

export default MyRequest;
