import { useState, useEffect } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi2';
import { USER_TYPES } from '../utils/userType';
import { API_BASE_URL } from '../config/api';
import RequestCard, { RequestCardApprovalActions } from './RequestCard';
import { RequestApproveModal, RequestRejectModal } from './RequestActionModal';
import { usePtoRequestActions } from '../hooks/usePtoRequestActions';
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

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const supervisorId = currentUser.id;

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
    roleLabel: 'Supervisor',
    onSuccess: (updatedRequest) => {
      setRequests((prev) =>
        prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req))
      );
    },
  });

  useEffect(() => {
    if (supervisorId) {
      fetchTeamRequests();
    }
  }, [supervisorId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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
        limit: 100,
      });

      const teamResponse = await fetch(`${API_BASE_URL}/users/?${teamParams}`, {
        headers: getAuthHeaders(),
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

      const requestsResponse = await fetch(`${API_BASE_URL}/pto/requests?limit=100`, {
        headers: getAuthHeaders(),
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

  const canSupervisorAct = (request) =>
    request.status === 'PENDING' &&
    request.approval_status?.supervisor === 'PENDING';

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
    <RequestCard
      key={request.id}
      request={request}
      showRequester
      headerActions={
        canSupervisorAct(request) ? (
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

export default SupervisorApproveRequest;
