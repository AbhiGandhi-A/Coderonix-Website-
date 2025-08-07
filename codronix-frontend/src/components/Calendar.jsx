import React, { useState, useEffect } from 'react';
import '../styles/global.css'; // Assuming you have a CSS file for styling

const Calendar = ({ user, socket }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    type: 'meeting',
    attendees: []
  });

  useEffect(() => {
    fetchEvents();
    
    if (socket) {
      const handleEventCreated = (newEvent) => {
        // Prevent adding a duplicate if it's the current user's event
        // The sender already added it to their state after the API call
        if (newEvent.created_by._id !== user.id) {
          setEvents(prev => [...prev, newEvent]);
        }
      };

      const handleEventUpdated = (updatedEvent) => {
        setEvents(prev => prev.map(event => 
          event._id === updatedEvent._id ? updatedEvent : event
        ));
      };

      socket.on('event-created', handleEventCreated);
      socket.on('event-updated', handleEventUpdated);
      
      // Clean up the socket listeners on component unmount
      return () => {
        socket.off('event-created', handleEventCreated);
        socket.off('event-updated', handleEventUpdated);
      };
    }
  }, [socket, user.id]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calendar/events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...eventForm,
          group_id: user.group_id,
          created_by: user.id
        })
      });
      
      if (response.ok) {
        const newEvent = await response.json();
        
        // Update the state locally for the creator
        setEvents(prev => [...prev, newEvent]);
        
        // Emit the event to other connected clients in the group
        if (socket) {
          socket.emit('event-created', newEvent);
        }

        // Close modal and reset form
        setShowEventModal(false);
        setEventForm({
          title: '',
          description: '',
          date: '',
          time: '',
          type: 'meeting',
          attendees: []
        });
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = getDaysInMonth(currentDate);

  const getEventDotColor = (type) => {
    switch (type) {
      case 'meeting': return 'var(--primary-color)';
      case 'deadline': return 'var(--danger-color)';
      case 'reminder': return 'var(--secondary-color)';
      case 'celebration': return 'var(--success-color)';
      default: return 'var(--text-color)';
    }
  };

  return (
    <div className="calendar-component">
      <div className="calendar-header">
        <h2>📅 Team Calendar</h2>
        {user.role === 'leader' && (
          <button 
            onClick={() => setShowEventModal(true)}
            className="btn-primary"
          >
            ➕ Add Event
          </button>
        )}
      </div>

      <div className="calendar-navigation">
        <button 
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          className="nav-btn"
        >
          ‹
        </button>
        <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <button 
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          className="nav-btn"
        >
          ›
        </button>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header-row">
          <div className="day-header">Sun</div>
          <div className="day-header">Mon</div>
          <div className="day-header">Tue</div>
          <div className="day-header">Wed</div>
          <div className="day-header">Thu</div>
          <div className="day-header">Fri</div>
          <div className="day-header">Sat</div>
        </div>
        
        <div className="calendar-body">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day ${day ? 'active' : 'inactive'} ${
                day && day.toDateString() === new Date().toDateString() ? 'today' : ''
              }`}
              onClick={() => day && setSelectedDate(day)}
            >
              {day && (
                <>
                  <span className="day-number">{day.getDate()}</span>
                  <div className="day-events">
                    {getEventsForDate(day).slice(0, 2).map(event => (
                      <div 
                        key={event._id} 
                        className="event-dot" 
                        style={{ backgroundColor: getEventDotColor(event.type) }}
                      >
                        {event.title.substring(0, 10)}...
                      </div>
                    ))}
                    {getEventsForDate(day).length > 2 && (
                      <div className="more-events">+{getEventsForDate(day).length - 2}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="selected-date-events">
          <h3>Events for {selectedDate.toDateString()}</h3>
          <div className="events-list">
            {getEventsForDate(selectedDate).map(event => (
              <div key={event._id} className={`event-item ${event.type}`}>
                <div className="event-time">{event.time}</div>
                <div className="event-details">
                  <h4>{event.title}</h4>
                  <p>{event.description}</p>
                  <div className="event-attendees">
                    👥 {event.attendees.length} attendees
                  </div>
                </div>
              </div>
            ))}
            {getEventsForDate(selectedDate).length === 0 && (
              <p className="no-events">No events scheduled for this date</p>
            )}
          </div>
        </div>
      )}

      {user.role === 'leader' && showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Event</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowEventModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={createEvent} className="event-form">
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm({...eventForm, type: e.target.value})}
                >
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                  <option value="celebration">Celebration</option>
                </select>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Create Event
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEventModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;