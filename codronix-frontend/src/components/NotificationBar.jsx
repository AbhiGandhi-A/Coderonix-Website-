import React from 'react';

const NotificationBar = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-bar">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'message' && '💬'}
              {notification.type === 'task' && '📋'}
              {notification.type === 'file' && '📁'}
            </span>
            <span className="notification-text">{notification.content}</span>
          </div>
          <button 
            onClick={() => onRemove(notification.id)}
            className="notification-close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationBar;