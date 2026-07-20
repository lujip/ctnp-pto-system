import { useState, useEffect, useCallback } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import RequestCard, { RequestCardApprovalActions } from './RequestCard';
import { RequestApproveModal, RequestRejectModal } from './RequestActionModal';
import { usePtoRequestActions } from '../hooks/usePtoRequestActions';
import './AdminApproveRequest.css';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' }
];

function AdminApproveRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const hasSupervisorApproval = (request) => Boolean(request.approved_by_supervisor);
  const hasManagerApproval = (request) => Boolean(request.approved_by_manager);

  const isEligibleForAdminReview = (request) =>
    hasSupervisorApproval(request) && hasManagerApproval(request);

  const fetchAdminRequests = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const requestsResponse = await fetch(`${API_BASE_URL}/pto/requests?limit=100`, {
        headers: getAuthHeaders(),
      });

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        const adminRequests = (data.requests || []).filter(isEligibleForAdminReview);
        setRequests(adminRequests);
      } else {
        setError('Failed to fetch requests');
        setRequests([]);
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching admin requests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const {
    actionId,
    roleLabel,
    showApproveModal,
    approveTarget,
    approveComments,
    setApproveComments,
    approveError,
    showRejectModal,
    rejectTarget,
    rejectComments,
    setRejectComments,
    rejectError,
    handleOpenApproveModal,
    handleCloseApproveModal,
    handleApproveSubmit,
    handleOpenRejectModal,
    handleCloseRejectModal,
    handleRejectSubmit,
    isActionLoading,
  } = usePtoRequestActions({
    roleLabel: 'Admin',
    onSuccess: () => fetchAdminRequests({ silent: true }),
  });

  useEffect(() => {
    fetchAdminRequests();
  }, [fetchAdminRequests]);

  const canAdminAct = (request) =>
    request.status === 'PENDING' &&
    isEligibleForAdminReview(request) &&
    request.approval_status?.admin === 'PENDING';

  const isAdminApproved = (request) => Boolean(request.approved_by_admin);

  const matchesTab = (request, tab) => {
    switch (tab) {
      case 'APPROVED':
        return isAdminApproved(request);
      case 'REJECTED':
        return request.status?.toUpperCase() === 'REJECTED';
      case 'PENDING':
      default:
        return (
          isEligibleForAdminReview(request) &&
          request.status?.toUpperCase() === 'PENDING' &&
          !isAdminApproved(request)
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
        return 'No rejected PTO requests with supervisor and manager approval.';
      default:
        return 'No PTO requests awaiting your approval.';
    }
  };

  const renderRequestCard = (request) => (
    <RequestCard
      key={request.id}
      request={request}
      showRequester
      headerActions={
        canAdminAct(request) ? (
          <RequestCardApprovalActions
            onApprove={() => handleOpenApproveModal(request)}
            onReject={() => handleOpenRejectModal(request)}
            isApproving={isActionLoading(request.id, 'APPROVE')}
            isRejecting={isActionLoading(request.id, 'REJECT')}
            disabled={actionId === request.id}
          />
        ) : null
      }
    />
  );

  if (loading) {
    return (
      <div className="admin-approve-container">
        <div className="loading-state">
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-approve-container">
      <div className="admin-approve-header">
        <h2>Approve Requests</h2>
        <p>Review all PTO requests that have supervisor and manager approval</p>
      </div>

      {error && <div className="error-message">{error}</div>}

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
          <h3>No Requests</h3>
          <p>No PTO requests with supervisor and manager approval found.</p>
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

      {showApproveModal && (
        <RequestApproveModal
          request={approveTarget}
          roleLabel={roleLabel}
          comments={approveComments}
          onCommentsChange={setApproveComments}
          onSubmit={handleApproveSubmit}
          onClose={handleCloseApproveModal}
          isSubmitting={Boolean(actionId)}
          error={approveError}
        />
      )}

      {showRejectModal && (
        <RequestRejectModal
          request={rejectTarget}
          comments={rejectComments}
          onCommentsChange={setRejectComments}
          onSubmit={handleRejectSubmit}
          onClose={handleCloseRejectModal}
          isSubmitting={Boolean(actionId)}
          error={rejectError}
        />
      )}
    </div>
  );
}

export default AdminApproveRequest;
