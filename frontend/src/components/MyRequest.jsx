import { useState, useEffect } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi2';
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

  const handleCancelSuccess = (requestId) => {
    setRequests((currentRequests) => currentRequests.filter((req) => req.id !== requestId));
  };

  const renderRequestCard = (request) => (
    <RequestCard
      key={request.id}
      request={request}
      allowCancel
      onCancelSuccess={handleCancelSuccess}
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
