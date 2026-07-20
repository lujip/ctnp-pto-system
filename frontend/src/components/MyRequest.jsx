import { useState, useEffect } from 'react';
import { HiOutlineCalendar, HiOutlineTrash } from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import RequestCard from './RequestCard';
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
        `${API_BASE_URL}/pto/requests?employee_id=${user.id}`,
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
      const response = await fetch(`${API_BASE_URL}/pto/requests/${requestId}`, {
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

  const renderRequestCard = (request) => (
    <RequestCard
      key={request.id}
      request={request}
      headerActions={
        request.status === 'PENDING' ? (
          <button
            className="cancel-btn"
            onClick={() => handleCancelRequest(request.id)}
            disabled={deletingId === request.id}
          >
            <HiOutlineTrash />
            {deletingId === request.id ? 'Canceling...' : 'Cancel'}
          </button>
        ) : null
      }
    />
  );

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
