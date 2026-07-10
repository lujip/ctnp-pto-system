import { useState, useEffect } from 'react';
import Calendar from './Calendar';
import { USER_TYPES, normalizeUserType } from '../utils/userType';
import { API_BASE_URL } from '../config/api';
import './RequestPTO.css';

function RequestPTO() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [formData, setFormData] = useState({
    leave_type: '',
    leave_dates: [],
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userBalance, setUserBalance] = useState({});
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userType = normalizeUserType(currentUser.user_type);

  const getAutoApprovalMessage = () => {
    if (userType === USER_TYPES.SUPERVISOR) {
      return 'As a supervisor, your request will be automatically approved at the supervisor level.';
    }
    if (userType === USER_TYPES.MANAGER) {
      return 'As a manager, your request will be automatically approved at the supervisor and manager levels.';
    }
    return '';
  };

  const autoApprovalMessage = getAutoApprovalMessage();

  useEffect(() => {
    fetchLeaveTypes();
    fetchUserBalance();
  }, []);

  useEffect(() => {
    if (success) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [success]);

  const fetchLeaveTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/pto/leave-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveTypes(data.leave_types);
      }
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await fetch(`${API_BASE_URL}/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.user.leave_balances || {});
      }
    } catch (err) {
      console.error('Error fetching user balance:', err);
    }
  };

  const handleDateSelect = (dates) => {
    setFormData(prev => ({ ...prev, leave_dates: dates }));
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.leave_type || formData.leave_dates.length === 0) {
      setError('Please select leave type and dates');
      setLoading(false);
      return;
    }

    const totalDays = formData.leave_dates.length;
    const balance = userBalance[formData.leave_type] || 0;
    
    if (totalDays > balance) {
      setError(`Insufficient leave balance. Available: ${balance} days`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Sort dates to get start and end
      const sortedDates = [...formData.leave_dates].sort((a, b) => a - b);
      const start_date = sortedDates[0];
      const end_date = sortedDates[sortedDates.length - 1];
      
      const response = await fetch(`${API_BASE_URL}/pto/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leave_type: formData.leave_type,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString(),
          total_days: totalDays,
          leave_dates: formData.leave_dates.map(d => d.toISOString()),
          reason: formData.reason
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('PTO request submitted successfully!');
        setFormData({
          leave_type: '',
          leave_dates: [],
          reason: ''
        });
        fetchUserBalance();
      } else {
        setError(data.message || 'Failed to submit request');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.');
      console.error('Error submitting request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="request-pto-container">
      <div className="request-pto-header">
        <h2>Request Time Off</h2>
        <p>Select dates on the calendar for your time off request</p>
        {autoApprovalMessage && (
          <p className="auto-approval-notice">{autoApprovalMessage}</p>
        )}
      </div>

      <div className="leave-balances">
        <h3>Your Leave Balances</h3>
        <div className="balance-cards">
          {Object.entries(userBalance).map(([type, days]) => (
            <div key={type} className="balance-card">
              <div className="balance-type">{type}</div>
              <div className="balance-days">{days}</div>
              <div className="balance-label">days available</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="request-pto-form">
        {error && (
          <div className="message error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="message success-message">
            {success}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="leave_type">Leave Type *</label>
          <select
            id="leave_type"
            name="leave_type"
            value={formData.leave_type}
            onChange={handleChange}
            required
            disabled={loading}
          >
            <option value="">Select Leave Type</option>
            {leaveTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Leave Dates *</label>
          <Calendar 
            selectedDates={formData.leave_dates}
            onDateSelect={handleDateSelect}
          />
        </div>

        {formData.leave_dates.length > 0 && (
          <div className="selected-dates-info">
            <h4>Selected Dates ({formData.leave_dates.length} {formData.leave_dates.length === 1 ? 'day' : 'days'})</h4>
            <div className="selected-dates-list">
              {formData.leave_dates
                .sort((a, b) => a - b)
                .map((date, index) => (
                  <span key={index} className="selected-date-badge">
                    {formatDateForDisplay(date)}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="reason">Reason</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows="4"
            placeholder="Please provide a brief reason for your time off request"
            disabled={loading}
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => setFormData({
              leave_type: '',
              leave_dates: [],
              reason: ''
            })}
            disabled={loading}
          >
            Clear
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RequestPTO;
