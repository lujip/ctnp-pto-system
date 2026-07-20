import { useState, useEffect, useCallback } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi2';
import { USER_TYPES } from '../utils/userType';
import { API_BASE_URL } from '../config/api';
import RequestCard, { RequestCardApprovalActions } from './RequestCard';
import { RequestApproveModal, RequestRejectModal } from './RequestActionModal';
import { usePtoRequestActions } from '../hooks/usePtoRequestActions';
import './ManagerApproveRequest.css';

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' }
];

const DEPARTMENT_USER_TYPES = `${USER_TYPES.EMPLOYEE},${USER_TYPES.SUPERVISOR}`;

function ManagerApproveRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const managerId = currentUser.id;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const hasSupervisorApproval = (request) => Boolean(request.approved_by_supervisor);

  const fetchManagerRequests = useCallback(async ({ silent = false } = {}) => {
    if (!managerId) {
      setError('Manager session not found. Please log in again.');
      setRequests([]);
      if (!silent) setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError('');

      const teamParams = new URLSearchParams({
        manager_id: managerId,
        user_types: DEPARTMENT_USER_TYPES,
        limit: 100,
      });

      const teamResponse = await fetch(`${API_BASE_URL}/users/?${teamParams}`, {
        headers: getAuthHeaders(),
      });

      if (!teamResponse.ok) {
        const data = await teamResponse.json();
        setError(data.message || 'Failed to fetch department members');
        setRequests([]);
        return;
      }

      const teamData = await teamResponse.json();
      const departmentMemberIds = new Set((teamData.users || []).map((member) => member.id));

      const requestsResponse = await fetch(`${API_BASE_URL}/pto/requests?limit=100`, {
        headers: getAuthHeaders(),
      });

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        const managerRequests = (data.requests || []).filter((req) =>
          hasSupervisorApproval(req) &&
          (departmentMemberIds.has(req.employee_id) || departmentMemberIds.has(req.requester_id))
        );
        setRequests(managerRequests);
      } else {
        setError('Failed to fetch requests');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching manager requests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [managerId]);

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
    roleLabel: 'Manager',
    onSuccess: () => fetchManagerRequests({ silent: true }),
  });

  useEffect(() => {
    if (managerId) {
      fetchManagerRequests();
    }
  }, [managerId, fetchManagerRequests]);

  const canManagerAct = (request) =>
    request.status === 'PENDING' &&
    hasSupervisorApproval(request) &&
    request.approval_status?.manager === 'PENDING';

  const isManagerApproved = (request) => Boolean(request.approved_by_manager);

  const matchesTab = (request, tab) => {
    switch (tab) {
      case 'APPROVED':
        return isManagerApproved(request);
      case 'REJECTED':
        return request.status?.toUpperCase() === 'REJECTED';
      case 'PENDING':
      default:
        return (
          hasSupervisorApproval(request) &&
          request.status?.toUpperCase() === 'PENDING' &&
          !isManagerApproved(request)
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
        return 'No rejected PTO requests with supervisor approval.';
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
        canManagerAct(request) ? (
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
      <div className="manager-approve-container">
        <div className="loading-state">
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manager-approve-container">
      <div className="manager-approve-header">
        <h2>Approve Requests</h2>
        <p>Review PTO requests that have supervisor approval</p>
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
          <p>No PTO requests with supervisor approval from your current department team.</p>
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

export default ManagerApproveRequest;
