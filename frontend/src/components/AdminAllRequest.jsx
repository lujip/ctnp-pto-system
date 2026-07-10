import { useState, useEffect } from 'react';
import {
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUser,
  HiOutlineXMark,
  HiOutlineChevronRight
} from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import './AdminAllRequest.css';

function AdminAllRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/pto/requests?limit=100`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else {
        setError('Failed to fetch requests');
        setRequests([]);
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching all requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate, endDate) =>
    `${formatDate(startDate)} - ${formatDate(endDate)}`;

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

  const handleOpenModal = (request) => {
    setSelectedRequest(request);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div className="admin-all-container">
        <div className="loading-state">
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-all-container">
      <div className="admin-all-header">
        <div>
          <h2>All Requests</h2>
          <p>View every PTO request across the organization</p>
        </div>
        <span className="request-count">{requests.length} total</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      {requests.length === 0 ? (
        <div className="empty-state">
          <HiOutlineCalendar className="empty-icon" />
          <h3>No Requests</h3>
          <p>No PTO requests have been submitted yet.</p>
        </div>
      ) : (
        <div className="requests-table-wrapper">
          <div className="requests-table-header">
            <span className="col-requester">Requester</span>
            <span className="col-type">Leave Type</span>
            <span className="col-dates">Dates</span>
            <span className="col-days">Days</span>
            <span className="col-status">Status</span>
            <span className="col-action" aria-hidden="true" />
          </div>
          <ul className="requests-list-compact">
            {requests.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  className={`request-row ${request.status?.toLowerCase()}`}
                  onClick={() => handleOpenModal(request)}
                >
                  <span className="col-requester">
                    <span className="requester-name">
                      {request.requester_name || 'Unknown Employee'}
                    </span>
                    {request.department && (
                      <span className="requester-dept">{request.department}</span>
                    )}
                  </span>
                  <span className="col-type">
                    <span className="leave-type-badge">{request.leave_type}</span>
                  </span>
                  <span className="col-dates">
                    {formatDateRange(request.start_date, request.end_date)}
                  </span>
                  <span className="col-days">
                    {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
                  </span>
                  <span className="col-status">
                    <span className={`status-pill ${request.status?.toLowerCase()}`}>
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </span>
                  <span className="col-action">
                    <HiOutlineChevronRight className="row-chevron" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedRequest && (
        <div className="detail-modal-overlay" onClick={handleCloseModal}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div>
                <h3>PTO Request Details</h3>
                <p className="detail-modal-subtitle">
                  {selectedRequest.leave_type} &middot; {selectedRequest.status}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                <HiOutlineXMark />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="detail-section">
                <div className="requester-info">
                  <HiOutlineUser className="requester-icon" />
                  <div className="requester-details">
                    <span className="info-label">Requester</span>
                    <span className="requester-name-lg">
                      {selectedRequest.requester_name || 'Unknown Employee'}
                    </span>
                    {selectedRequest.department && (
                      <span className="requester-department">{selectedRequest.department}</span>
                    )}
                    {selectedRequest.requester_email && (
                      <span className="requester-email">{selectedRequest.requester_email}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span className="info-label">Date Range</span>
                  <span className="info-value">
                    {formatDateRange(selectedRequest.start_date, selectedRequest.end_date)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="info-label">Total Days</span>
                  <span className="info-value">
                    {selectedRequest.total_days}{' '}
                    {selectedRequest.total_days === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="info-label">Submitted</span>
                  <span className="info-value">{formatDate(selectedRequest.submitted_date)}</span>
                </div>
                <div className="detail-item">
                  <span className="info-label">Status</span>
                  <span className={`status-pill ${selectedRequest.status?.toLowerCase()}`}>
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="detail-section">
                  <span className="info-label">Reason</span>
                  <p className="reason-text">{selectedRequest.reason}</p>
                </div>
              )}

              <div className="detail-section">
                <span className="info-label">Selected Dates</span>
                <div className="selected-dates-compact">
                  {selectedRequest.leave_dates && selectedRequest.leave_dates.length > 0 ? (
                    selectedRequest.leave_dates.map((date, index) => (
                      <span key={index} className="date-badge-small">
                        {formatDate(date)}
                      </span>
                    ))
                  ) : (
                    <span className="date-badge-small">
                      {formatDateRange(selectedRequest.start_date, selectedRequest.end_date)}
                    </span>
                  )}
                </div>
              </div>

              {selectedRequest.approval_status &&
                getApprovalStatusBadge(selectedRequest.approval_status)}

              {selectedRequest.rejection_reason && (
                <div className="detail-section rejection-block">
                  <span className="info-label">Rejection Reason</span>
                  <p className="rejection-reason">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAllRequest;
