import { HiOutlineXMark } from 'react-icons/hi2';
import './RequestActionModal.css';

export function RequestApproveModal({
  request,
  roleLabel,
  comments,
  onCommentsChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}) {
  if (!request) return null;

  return (
    <div className="request-action-modal-overlay" onClick={onClose}>
      <div className="request-action-modal" onClick={(event) => event.stopPropagation()}>
        <div className="request-action-modal-header">
          <h3>{roleLabel} Approval</h3>
          <button
            type="button"
            className="request-action-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close approval dialog"
          >
            <HiOutlineXMark />
          </button>
        </div>

        <form onSubmit={onSubmit} className="request-action-modal-form">
          <p className="request-action-modal-subtitle">
            Approving request from{' '}
            <strong>{request.requester_name || 'Unknown Employee'}</strong>
            {' '}({request.leave_type})
          </p>

          {error && <div className="request-action-modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="approve_comments">Approval notes (optional)</label>
            <textarea
              id="approve_comments"
              value={comments}
              onChange={(event) => onCommentsChange(event.target.value)}
              placeholder="Add notes for this approval..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="request-action-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-approve-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Approving...' : 'Approve Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RequestRejectModal({
  request,
  comments,
  onCommentsChange,
  onSubmit,
  onClose,
  isSubmitting,
  error,
}) {
  if (!request) return null;

  return (
    <div className="request-action-modal-overlay" onClick={onClose}>
      <div className="request-action-modal" onClick={(event) => event.stopPropagation()}>
        <div className="request-action-modal-header">
          <h3>Reject Request</h3>
          <button
            type="button"
            className="request-action-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close rejection dialog"
          >
            <HiOutlineXMark />
          </button>
        </div>

        <form onSubmit={onSubmit} className="request-action-modal-form">
          <p className="request-action-modal-subtitle">
            Rejecting request from{' '}
            <strong>{request.requester_name || 'Unknown Employee'}</strong>
            {' '}({request.leave_type})
          </p>

          {error && <div className="request-action-modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="reject_comments">Reason for rejection (optional)</label>
            <textarea
              id="reject_comments"
              value={comments}
              onChange={(event) => onCommentsChange(event.target.value)}
              placeholder="Provide a reason for rejecting this request..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="request-action-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-reject-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
