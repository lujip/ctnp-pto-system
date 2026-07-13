import { useState, useEffect, useMemo } from 'react';
import {
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi2';
import { API_BASE_URL } from '../config/api';
import './AvailabilityCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_MODES = ['week', 'month', 'year'];

const LEAVE_COLORS = {
  Vacation: '#4285f4',
  Sick: '#ea4335',
  Emergency: '#fbbc04',
  Personal: '#9c27b0'
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (value) => {
  if (!value) return null;
  const iso = /[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  local.setHours(0, 0, 0, 0);
  return local;
};

const getLeaveColor = (leaveType) => LEAVE_COLORS[leaveType] || '#667eea';

const expandEntryDates = (entry) => {
  const dates = new Set();

  if (entry.leave_dates?.length) {
    entry.leave_dates.forEach((dateValue) => {
      const parsed = parseDate(dateValue);
      if (parsed) dates.add(toDateKey(parsed));
    });
    return dates;
  }

  const start = parseDate(entry.start_date);
  const end = parseDate(entry.end_date);
  if (!start || !end) return dates;

  const current = new Date(start);
  while (current <= end) {
    dates.add(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getWeekStart = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
};

const getWeekDays = (date) => {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const getVisibleRange = (viewMode, currentDate) => {
  if (viewMode === 'week') {
    const days = getWeekDays(currentDate);
    return { start: days[0], end: days[6] };
  }

  if (viewMode === 'month') {
    return {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    };
  }

  return {
    start: new Date(currentDate.getFullYear(), 0, 1),
    end: new Date(currentDate.getFullYear(), 11, 31)
  };
};

const formatHeaderDate = (viewMode, currentDate) => {
  if (viewMode === 'week') {
    const days = getWeekDays(currentDate);
    const start = days[0];
    const end = days[6];
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${startLabel} – ${endLabel}`;
  }

  if (viewMode === 'month') {
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }

  return String(currentDate.getFullYear());
};

function AvailabilityCalendar() {
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    fetchCalendarEntries();
  }, [viewMode, currentDate]);

  const fetchCalendarEntries = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const range = getVisibleRange(viewMode, currentDate);
      const end = new Date(range.end);
      end.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: end.toISOString()
      });

      const response = await fetch(`${API_BASE_URL}/pto/calendar?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      } else {
        setError('Failed to load availability calendar');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Error fetching calendar entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const values = new Set(
      entries
        .map((entry) => entry.department?.trim())
        .filter(Boolean)
    );
    return ['all', ...Array.from(values).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (departmentFilter === 'all') return entries;
    return entries.filter((entry) => entry.department === departmentFilter);
  }, [entries, departmentFilter]);

  const entriesByDate = useMemo(() => {
    const map = new Map();

    filteredEntries.forEach((entry) => {
      expandEntryDates(entry).forEach((dateKey) => {
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey).push(entry);
      });
    });

    return map;
  }, [filteredEntries]);

  const navigate = (direction) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);

      if (viewMode === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else if (viewMode === 'month') {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setFullYear(next.getFullYear() + direction);
      }

      return next;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const renderEntryChip = (entry, compact = false) => {
    const isPending = entry.status === 'PENDING';

    return (
      <div
        key={`${entry.id}-${compact ? 'compact' : 'full'}`}
        className={`schedule-entry ${isPending ? 'pending' : 'approved'} ${compact ? 'compact' : ''}`}
        style={{ backgroundColor: getLeaveColor(entry.leave_type) }}
        title={`${entry.requester_name} (${entry.department || 'No department'}) - ${entry.leave_type}${isPending ? ' (Pending)' : ''}`}
      >
        <span className="entry-name">{entry.requester_name}</span>
        {!compact && entry.department && (
          <span className="entry-department">{entry.department}</span>
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const weekKeys = weekDays.map(toDateKey);

    const employees = Array.from(
      filteredEntries.reduce((map, entry) => {
        const key = entry.employee_id || entry.requester_id;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: entry.requester_name,
            department: entry.department || 'No department',
            entries: []
          });
        }
        map.get(key).entries.push(entry);
        return map;
      }, new Map()).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="week-schedule">
        <div className="week-schedule-header">
          <div className="employee-column-header">Employee</div>
          {weekDays.map((day) => {
            const isToday = toDateKey(day) === toDateKey(new Date());
            return (
              <div key={toDateKey(day)} className={`day-column-header ${isToday ? 'today' : ''}`}>
                <span className="day-name">{DAY_NAMES[day.getDay()]}</span>
                <span className="day-number">{day.getDate()}</span>
              </div>
            );
          })}
        </div>

        {employees.length === 0 ? (
          <div className="schedule-empty-row">
            <p>No scheduled time off for this week.</p>
          </div>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className="week-schedule-row">
              <div className="employee-cell">
                <span className="employee-name">{employee.name}</span>
                <span className="employee-department">{employee.department}</span>
              </div>
              {weekKeys.map((dateKey) => {
                const dayEntries = employee.entries.filter((entry) =>
                  expandEntryDates(entry).has(dateKey)
                );

                return (
                  <div key={`${employee.id}-${dateKey}`} className="schedule-day-cell">
                    {dayEntries.map((entry) => (
                      <div
                        key={`${employee.id}-${entry.id}-${dateKey}`}
                        className={`schedule-block ${entry.status === 'PENDING' ? 'pending' : ''}`}
                        style={{ backgroundColor: getLeaveColor(entry.leave_type) }}
                        title={`${entry.leave_type}${entry.status === 'PENDING' ? ' (Pending)' : ''}`}
                      >
                        {entry.leave_type}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = firstDay.getDay();
    const cells = [];

    for (let i = 0; i < startingDay; i += 1) {
      cells.push(<div key={`empty-${i}`} className="month-day-cell empty" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      const dayEntries = entriesByDate.get(dateKey) || [];
      const isToday = dateKey === toDateKey(new Date());

      cells.push(
        <div key={dateKey} className={`month-day-cell ${isToday ? 'today' : ''}`}>
          <div className="month-day-number">{day}</div>
          <div className="month-day-entries">
            {dayEntries.slice(0, 3).map((entry) => renderEntryChip(entry, true))}
            {dayEntries.length > 3 && (
              <span className="more-entries">+{dayEntries.length - 3} more</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="month-calendar">
        <div className="month-weekdays">
          {DAY_NAMES.map((day) => (
            <div key={day} className="month-weekday">{day}</div>
          ))}
        </div>
        <div className="month-grid">{cells}</div>
      </div>
    );
  };

  const renderYearView = () => {
    return (
      <div className="year-grid">
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const year = currentDate.getFullYear();
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          const startingDay = new Date(year, monthIndex, 1).getDay();
          const miniCells = [];

          for (let i = 0; i < startingDay; i += 1) {
            miniCells.push(<div key={`${monthName}-empty-${i}`} className="year-mini-day empty" />);
          }

          for (let day = 1; day <= daysInMonth; day += 1) {
            const dateKey = toDateKey(new Date(year, monthIndex, day));
            const count = (entriesByDate.get(dateKey) || []).length;
            const isToday = dateKey === toDateKey(new Date());

            miniCells.push(
              <div
                key={dateKey}
                className={`year-mini-day ${count > 0 ? 'has-entries' : ''} ${isToday ? 'today' : ''}`}
                title={count > 0 ? `${count} scheduled` : ''}
              >
                <span className="year-mini-day-number">{day}</span>
                {count > 0 && <span className="year-mini-count">{count}</span>}
              </div>
            );
          }

          return (
            <div key={monthName} className="year-month-card">
              <button
                type="button"
                className="year-month-title"
                onClick={() => {
                  setCurrentDate(new Date(year, monthIndex, 1));
                  setViewMode('month');
                }}
              >
                {monthName}
              </button>
              <div className="year-mini-weekdays">
                {DAY_NAMES.map((day) => (
                  <span key={`${monthName}-${day}`}>{day.charAt(0)}</span>
                ))}
              </div>
              <div className="year-mini-grid">{miniCells}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="availability-calendar-container">
      <div className="availability-header">
        <div>
          <h2>Team Availability</h2>
          <p>View employee schedules and time off across the organization</p>
        </div>
      </div>

      <div className="availability-toolbar">
        <div className="toolbar-left">
          <button type="button" className="nav-btn" onClick={() => navigate(-1)}>
            <HiChevronLeft />
          </button>
          <button type="button" className="today-btn" onClick={goToToday}>
            Today
          </button>
          <button type="button" className="nav-btn" onClick={() => navigate(1)}>
            <HiChevronRight />
          </button>
          <h3 className="current-period">{formatHeaderDate(viewMode, currentDate)}</h3>
        </div>

        <div className="toolbar-right">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="department-filter"
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'All Departments' : department}
              </option>
            ))}
          </select>

          <div className="view-toggle">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="availability-legend">
        {Object.entries(LEAVE_COLORS).map(([type, color]) => (
          <span key={type} className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-swatch pending" />
          Pending approval
        </span>
      </div>

      {loading && (
        <div className="availability-loading">
          <p>Loading schedule...</p>
        </div>
      )}

      {error && !loading && (
        <div className="availability-error">{error}</div>
      )}

      {!loading && !error && (
        <div className="availability-view">
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'year' && renderYearView()}
        </div>
      )}
    </div>
  );
}

export default AvailabilityCalendar;
