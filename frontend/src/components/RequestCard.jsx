import { useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineXCircle,
  HiOutlineXMark,
  HiOutlineChevronRight,
} from 'react-icons/hi2';
import {
  formatRequestDate,
  formatRequestDateRange,
  formatRequestDateTime,
  getRequestStatusClass,
} from '../utils/requestFormatters';
import './RequestCard.css';

export const APPROVAL_ROLES = [
  {
    key: 'supervisor',
    label: 'Supervisor',
    commentsKey: 'supervisor_comments',
    dateKey: 'supervisor_approved_date',
    approverNameKey: 'supervisor_approver_name',
    approverRoleKey: 'supervisor_approver_role',
  },
  {
    key: 'manager',
    label: 'Manager',
    commentsKey: 'manager_comments',
    dateKey: 'manager_approved_date',
    approverNameKey: 'manager_approver_name',
    approverRoleKey: 'manager_approver_role',
  },
  {
    key: 'admin',
    label: 'Admin',
    commentsKey: 'admin_comments',
    dateKey: 'admin_approved_date',
    approverNameKey: 'admin_approver_name',
    approverRoleKey: 'admin_approver_role',
  },
  {
    key: 'coo',
    label: 'COO',
    commentsKey: 'coo_comments',
    dateKey: 'coo_approved_date',
    approverNameKey: 'coo_approver_name',
    approverRoleKey: 'coo_approver_role',
  },
];

function getRoleStatus(request, roleKey) {
  return request.approval_status?.[roleKey]?.toUpperCase() || 'PENDING';
}

function getRoleNote(request, role) {
  const comment = request[role.commentsKey]?.trim();
  if (comment) return comment;

  const status = getRoleStatus(request, role.key);
  if (status === 'REJECTED' && request.rejection_reason?.trim()) {
    return request.rejection_reason.trim();
  }
  if (status === 'APPROVED' || status === 'REJECTED') {
    return 'No notes provided';
  }
  return 'Awaiting approval';
}

export function RequestCardDetailsModal({ request, onClose }) {
  const statusClass = getRequestStatusClass(request.status);

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

  return (
    <div className="request-card-modal-overlay" onClick={onClose}>
      <div
        className="request-card-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`request-card-modal-title-${request.id}`}
      >
        <div className="request-card-modal-header">
          <div>
            <h3 id={`request-card-modal-title-${request.id}`}>PTO Request Details</h3>
            <p className="request-card-modal-subtitle">
              {request.leave_type} ·{' '}
              <span className={`request-card-modal-subtitle-status ${statusClass}`}>
                <span className="request-card-modal-status-dot" aria-hidden="true" />
                {request.status}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="request-card-modal-close"
            onClick={onClose}
            aria-label="Close request details"
          >
            <HiOutlineXMark />
          </button>
        </div>

        <div className="request-card-modal-body">
          <div className="request-card-modal-section">
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
                {request.requester_email && (
                  <span className="requester-email">{request.requester_email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="request-card-modal-grid">
            <div className="info-item">
              <span className="info-label">Date Range</span>
              <span className="info-value">
                {formatRequestDateRange(request.start_date, request.end_date)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Days</span>
              <span className="info-value">
                {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Submitted</span>
              <span className="info-value">{formatRequestDate(request.submitted_date)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className={`request-card-modal-status ${statusClass}`}>
                {getStatusIcon(request.status)}
                {request.status}
              </span>
            </div>
            {request.employee_number && (
              <div className="info-item">
                <span className="info-label">Employee No.</span>
                <span className="info-value">{request.employee_number}</span>
              </div>
            )}
          </div>

          {request.reason && (
            <div className="request-card-modal-section">
              <span className="info-label">Reason</span>
              <p className="reason-text">{request.reason}</p>
            </div>
          )}

          <div className="request-card-modal-section">
            <span className="info-label">Selected Dates</span>
            <div className="selected-dates-compact">
              {request.leave_dates && request.leave_dates.length > 0 ? (
                request.leave_dates.map((date, index) => (
                  <span key={index} className="date-badge-small">
                    {formatRequestDate(date)}
                  </span>
                ))
              ) : (
                <span className="date-badge-small">
                  {formatRequestDateRange(request.start_date, request.end_date)}
                </span>
              )}
            </div>
          </div>

          <div className="request-card-modal-section">
            <span className="info-label">Approval Notes</span>
            <div className="approval-notes-list">
              {APPROVAL_ROLES.map((role) => {
                const status = getRoleStatus(request, role.key);
                const statusClassName = status.toLowerCase();
                const note = getRoleNote(request, role);
                const actionDate = request[role.dateKey];
                const approverName = request[role.approverNameKey];
                const approverRole = request[role.approverRoleKey];
                const showApproverDetails =
                  status !== 'PENDING' && (approverName || approverRole);

                return (
                  <div key={role.key} className={`approval-note-item ${role.key} ${statusClassName}`}>
                    <div className="approval-note-header">
                      <span className="approval-note-role">{role.label}</span>
                      <span className={`approval-note-status ${statusClassName}`}>{status}</span>
                    </div>
                    {showApproverDetails && (
                      <div className="approval-note-meta">
                        {approverName && (
                          <div className="approval-note-meta-item">
                            <span className="info-label">Approver Name</span>
                            <span className="info-value">{approverName}</span>
                          </div>
                        )}
                        {approverRole && (
                          <div className="approval-note-meta-item">
                            <span className="info-label">Role</span>
                            <span className="info-value">{approverRole}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {actionDate && (
                      <span className="approval-note-date">
                        {formatRequestDateTime(actionDate)}
                      </span>
                    )}
                    <p className="approval-note-text">{note}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {request.rejection_reason && request.status === 'REJECTED' && (
            <div className="request-card-modal-section rejection-block">
              <span className="info-label">Rejection Reason</span>
              {(request.rejected_by_name || request.rejected_by_role) && (
                <div className="approval-note-meta">
                  {request.rejected_by_name && (
                    <div className="approval-note-meta-item">
                      <span className="info-label">Approver Name</span>
                      <span className="info-value">{request.rejected_by_name}</span>
                    </div>
                  )}
                  {request.rejected_by_role && (
                    <div className="approval-note-meta-item">
                      <span className="info-label">Role</span>
                      <span className="info-value">{request.rejected_by_role}</span>
                    </div>
                  )}
                </div>
              )}
              <p className="rejection-reason">{request.rejection_reason}</p>
              {request.rejected_date && (
                <span className="approval-note-date">
                  Rejected on {formatRequestDateTime(request.rejected_date)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, showRequester = false, headerActions = null, className = '' }) {
  const [showDetails, setShowDetails] = useState(false);
  const statusClass = getRequestStatusClass(request.status);

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

  const getApprovalStatusBadge = (approvalStatus) => {
    if (!approvalStatus) return null;

    return (
      <div className="approval-badges">
        {APPROVAL_ROLES.map((role) => (
          <span
            key={role.key}
            className={`approval-badge ${role.key} ${approvalStatus[role.key]?.toLowerCase()}`}
          >
            {role.label}: {approvalStatus[role.key] || 'PENDING'}
          </span>
        ))}
      </div>
    );
  };

  const openDetails = () => setShowDetails(true);
  const closeDetails = () => setShowDetails(false);

  const handleBodyKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openDetails();
    }
  };

  return (
    <>
      <div className={`request-card ${statusClass} request-card--clickable ${className}`.trim()}>
        <div className="request-card-header">
          <div className="request-type-status">
            <span className="leave-type-badge">{request.leave_type}</span>
            <div className="status-container">
              {getStatusIcon(request.status)}
              <span className={`status-text ${statusClass}`}>{request.status}</span>
            </div>
          </div>
          {headerActions && (
            <div
              className="request-card-header-actions"
              onClick={(event) => event.stopPropagation()}
            >
              {headerActions}
            </div>
          )}
        </div>

        <div
          className="request-card-body"
          onClick={openDetails}
          onKeyDown={handleBodyKeyDown}
          role="button"
          tabIndex={0}
          aria-label="View request details and approval notes"
        >
          {showRequester && (
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
          )}

          <div className="request-info-row">
            <div className="info-item">
              <span className="info-label">Date Range:</span>
              <span className="info-value">
                {formatRequestDateRange(request.start_date, request.end_date)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Days:</span>
              <span className="info-value">
                {request.total_days} {request.total_days === 1 ? 'day' : 'days'}
              </span>
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
                    {formatRequestDate(date)}
                  </span>
                ))
              ) : (
                <span className="date-badge-small">
                  {formatRequestDateRange(request.start_date, request.end_date)}
                </span>
              )}
              {request.leave_dates && request.leave_dates.length > 5 && (
                <span className="date-badge-small more">
                  +{request.leave_dates.length - 5} more
                </span>
              )}
            </div>
          </div>

          {request.approval_status && getApprovalStatusBadge(request.approval_status)}

          <div className="request-footer">
            <span className="submitted-date">
              Submitted: {formatRequestDate(request.submitted_date)}
            </span>
            <span className="request-card-expand-hint">
              View details
              <HiOutlineChevronRight />
            </span>
          </div>
        </div>
      </div>

      {showDetails && (
        <RequestCardDetailsModal
          request={request}
          onClose={closeDetails}
        />
      )}
    </>
  );
}

export function RequestCardApprovalActions({
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
  disabled = false,
}) {
  return (
    <div className="approval-actions">
      <button
        type="button"
        className="approve-btn"
        onClick={onApprove}
        disabled={disabled || isApproving || isRejecting}
      >
        <HiOutlineCheckCircle />
        {isApproving ? 'Approving...' : 'Approve'}
      </button>
      <button
        type="button"
        className="reject-btn"
        onClick={onReject}
        disabled={disabled || isApproving || isRejecting}
      >
        <HiOutlineXCircle />
        {isRejecting ? 'Rejecting...' : 'Reject'}
      </button>
    </div>
  );
}

export default RequestCard;
