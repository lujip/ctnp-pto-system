import { useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import './Calendar.css';

function Calendar({ selectedDates = [], onDateSelect, minDate = new Date() }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const isDateSelected = (date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    const isSelected = isDateSelected(date);
    let newSelectedDates;

    if (isSelected) {
      newSelectedDates = selectedDates.filter(
        d => d.toDateString() !== date.toDateString()
      );
    } else {
      newSelectedDates = [...selectedDates, date].sort((a, b) => a - b);
    }

    onDateSelect(newSelectedDates);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = isDateSelected(date);
      const isDisabled = isDateDisabled(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button type="button" onClick={previousMonth} className="calendar-nav-btn">
          <HiChevronLeft />
        </button>
        <div className="calendar-month-year">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button type="button" onClick={nextMonth} className="calendar-nav-btn">
          <HiChevronRight />
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {daysOfWeek.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
