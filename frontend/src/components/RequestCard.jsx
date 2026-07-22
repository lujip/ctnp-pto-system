import { useState, useEffect, useRef } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineXCircle,
  HiOutlineXMark,
  HiOutlineChevronRight,
  HiOutlineTrash,
  HiOutlinePaperClip,
  HiOutlineArrowDownTray,
  HiOutlineEye,
} from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import { attachmentsAPI } from '../services/api';
import {
  formatRequestDate,
  formatRequestDateRange,
  formatRequestDateTime,
  getRequestStatusClass,
} from '../utils/requestFormatters';
import './RequestCard.css';

const PTO_REQUEST_ENTITY_TYPE = 'pto_request';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function deleteAttachmentsForRequest(requestId) {
  return attachmentsAPI.deleteByEntity(PTO_REQUEST_ENTITY_TYPE, requestId);
}

export async function deletePtoRequestWithAttachments(requestId) {
  await deleteAttachmentsForRequest(requestId);

  const response = await fetch(`${API_BASE_URL}/pto/requests/${requestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function RequestCardCancelButton({
  requestId,
  onSuccess,
  disabled = false,
  className = 'cancel-btn',
}) {
  const [deleting, setDeleting] = useState(false);

  const handleCancel = async (event) => {
    event.stopPropagation();

    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      setDeleting(true);
      const { response, data } = await deletePtoRequestWithAttachments(requestId);

      if (response.ok) {
        onSuccess?.(requestId);
      } else {
        alert(data.message || 'Failed to cancel request');
      }
    } catch (err) {
      alert('Unable to cancel request. Please try again.');
      console.error('Error canceling request:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleCancel}
      disabled={disabled || deleting}
    >
      <HiOutlineTrash />
      {deleting ? 'Canceling...' : 'Cancel'}
    </button>
  );
}

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

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentViewerType(attachment) {
  const mimeType = (attachment.mime_type || '').toLowerCase();
  const filename = (attachment.original_filename || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'unsupported';
}

function useRequestAttachments(requestId) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requestId) {
      setAttachments([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchAttachments = async () => {
      try {
        setLoading(true);
        setError('');

        const { response, data } = await attachmentsAPI.list({
          entityType: PTO_REQUEST_ENTITY_TYPE,
          entityId: requestId,
        });

        if (cancelled) return;

        if (response.ok) {
          setAttachments(data.attachments || []);
        } else {
          setAttachments([]);
          setError(data.message || 'Failed to load attachments');
        }
      } catch (err) {
        if (!cancelled) {
          setAttachments([]);
          setError('Unable to load attachments');
          console.error('Error fetching attachments:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAttachments();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return { attachments, loading, error };
}

function AttachmentViewerModal({ attachment, onClose, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [objectUrl, setObjectUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const blobUrlRef = useRef('');
  const viewerType = getAttachmentViewerType(attachment);

  useEffect(() => {
    let cancelled = false;

    const loadAttachment = async () => {
      try {
        setLoading(true);
        setError('');
        setObjectUrl('');
        setTextContent('');

        const blob = await attachmentsAPI.fetchBlob(attachment.id);
        if (cancelled) return;

        if (viewerType === 'text') {
          setTextContent(await blob.text());
          return;
        }

        const blobUrl = window.URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setObjectUrl(blobUrl);
      } catch (err) {
        if (!cancelled) {
          setError('Unable to load attachment preview.');
          console.error('Error loading attachment preview:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAttachment();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = '';
      }
    };
  }, [attachment.id, viewerType]);

  const renderViewerContent = () => {
    if (loading) {
      return <p className="attachment-viewer-message">Loading preview...</p>;
    }

    if (error) {
      return <p className="attachment-viewer-message attachment-viewer-message--error">{error}</p>;
    }

    if (viewerType === 'unsupported') {
      return (
        <div className="attachment-viewer-fallback">
          <p className="attachment-viewer-message">
            Preview is not available for this file type. Download the file to open it locally.
          </p>
          <button
            type="button"
            className="request-attachment-download-btn"
            onClick={() => onDownload?.(attachment)}
          >
            <HiOutlineArrowDownTray />
            Download
          </button>
        </div>
      );
    }

    if (viewerType === 'text') {
      return (
        <pre className="attachment-viewer-text">{textContent}</pre>
      );
    }

    if (viewerType === 'image') {
      return (
        <img
          src={objectUrl}
          alt={attachment.original_filename}
          className="attachment-viewer-image"
        />
      );
    }

    if (viewerType === 'pdf') {
      return (
        <iframe
          src={objectUrl}
          title={attachment.original_filename}
          className="attachment-viewer-frame"
        />
      );
    }

    if (viewerType === 'video') {
      return (
        <video
          src={objectUrl}
          controls
          className="attachment-viewer-media"
        >
          Your browser does not support video playback.
        </video>
      );
    }

    if (viewerType === 'audio') {
      return (
        <audio
          src={objectUrl}
          controls
          className="attachment-viewer-audio"
        >
          Your browser does not support audio playback.
        </audio>
      );
    }

    return null;
  };

  return (
    <div className="attachment-viewer-overlay" onClick={onClose}>
      <div
        className="attachment-viewer-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`attachment-viewer-title-${attachment.id}`}
      >
        <div className="attachment-viewer-header">
          <div>
            <h3 id={`attachment-viewer-title-${attachment.id}`}>
              {attachment.original_filename}
            </h3>
            <p className="attachment-viewer-subtitle">
              {formatFileSize(attachment.size)}
              {attachment.mime_type ? ` · ${attachment.mime_type}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="request-card-modal-close"
            onClick={onClose}
            aria-label="Close attachment preview"
          >
            <HiOutlineXMark />
          </button>
        </div>

        <div className="attachment-viewer-body">
          {renderViewerContent()}
        </div>
      </div>
    </div>
  );
}

function RequestAttachmentsSection({
  attachments,
  loading,
  error,
  variant = 'full',
  onDownload,
  onView,
  downloadingId = null,
}) {
  if (loading) {
    return (
      <div className={`request-attachments request-attachments--${variant}`}>
        <span className="info-label">Attachments</span>
        <p className="request-attachments-message">Loading attachments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`request-attachments request-attachments--${variant}`}>
        <span className="info-label">Attachments</span>
        <p className="request-attachments-message request-attachments-message--error">{error}</p>
      </div>
    );
  }

  if (attachments.length === 0) {
    if (variant === 'compact') {
      return null;
    }

    return (
      <div className={`request-attachments request-attachments--${variant}`}>
        <span className="info-label">Attachments</span>
        <p className="request-attachments-message">No attachments uploaded.</p>
      </div>
    );
  }

  if (variant === 'compact') {
    const previewNames = attachments
      .slice(0, 2)
      .map((attachment) => attachment.original_filename)
      .join(', ');
    const remainingCount = attachments.length - 2;

    return (
      <div className="request-attachments request-attachments--compact">
        <span className="info-label">Attachments:</span>
        <div className="request-attachments-compact">
          <span className="request-attachments-count">
            <HiOutlinePaperClip />
            {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
          <span className="request-attachments-preview">
            {previewNames}
            {remainingCount > 0 ? ` +${remainingCount} more` : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`request-attachments request-attachments--${variant}`}>
      <span className="info-label">Attachments</span>
      <ul className="request-attachments-list">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="request-attachment-item">
            <div className="request-attachment-info">
              <HiOutlinePaperClip className="request-attachment-icon" />
              <div className="request-attachment-details">
                <span className="request-attachment-name">{attachment.original_filename}</span>
                <span className="request-attachment-meta">
                  {formatFileSize(attachment.size)}
                  {attachment.mime_type ? ` · ${attachment.mime_type}` : ''}
                </span>
              </div>
            </div>
            <div className="request-attachment-actions">
              <button
                type="button"
                className="request-attachment-view-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onView?.(attachment);
                }}
                aria-label={`View ${attachment.original_filename}`}
              >
                <HiOutlineEye />
                View
              </button>
              <button
                type="button"
                className="request-attachment-download-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onDownload?.(attachment);
                }}
                disabled={downloadingId === attachment.id}
                aria-label={`Download ${attachment.original_filename}`}
              >
                <HiOutlineArrowDownTray />
                {downloadingId === attachment.id ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RequestCardDetailsModal({ request, onClose }) {
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState(null);
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const { attachments, loading: attachmentsLoading, error: attachmentsError } =
    useRequestAttachments(request.id);
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

  const handleDownloadAttachment = async (attachment) => {
    try {
      setDownloadingAttachmentId(attachment.id);
      await attachmentsAPI.triggerDownload(attachment);
    } catch (err) {
      alert('Unable to download attachment. Please try again.');
      console.error('Error downloading attachment:', err);
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const handleViewAttachment = (attachment) => {
    setViewingAttachment(attachment);
  };

  return (
    <>
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

          <RequestAttachmentsSection
            attachments={attachments}
            loading={attachmentsLoading}
            error={attachmentsError}
            variant="full"
            onView={handleViewAttachment}
            onDownload={handleDownloadAttachment}
            downloadingId={downloadingAttachmentId}
          />

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

    {viewingAttachment && (
      <AttachmentViewerModal
        attachment={viewingAttachment}
        onClose={() => setViewingAttachment(null)}
        onDownload={handleDownloadAttachment}
      />
    )}
    </>
  );
}

function RequestCard({
  request,
  showRequester = false,
  headerActions = null,
  allowCancel = false,
  onCancelSuccess = null,
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false);
  const { attachments, loading: attachmentsLoading, error: attachmentsError } =
    useRequestAttachments(request.id);
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
          {!headerActions && allowCancel && request.status === 'PENDING' && (
            <div
              className="request-card-header-actions"
              onClick={(event) => event.stopPropagation()}
            >
              <RequestCardCancelButton
                requestId={request.id}
                onSuccess={onCancelSuccess}
              />
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

          <RequestAttachmentsSection
            attachments={attachments}
            loading={attachmentsLoading}
            error={attachmentsError}
            variant="compact"
          />

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
