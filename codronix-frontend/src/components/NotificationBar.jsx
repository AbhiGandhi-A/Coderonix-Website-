import React, { useEffect } from 'react';

const NotificationBar = ({ notifications, onRemove }) => {
  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        onRemove(notifications[0].id);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notifications, onRemove]);

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message': return '💬';
      case 'task': return '📋';
      case 'task-completed': return '✅';
      case 'task-started': return '🚀';
      case 'task-progress': return '📈';
      case 'file': return '📁';
      case 'user-joined': return '👋';
      default: return '📢';
    }
  };

  const formatNotificationContent = (notification) => {
    const { type, data, content } = notification;
    
    // Handle different notification types with proper data
    switch (type) {
      case 'task-completed':
        if (data && data.task && data.user) {
          const taskTitle = data.task.title || 'Unknown Task';
          const userName = data.user.name || 'Someone';
          return `${userName} completed task: "${taskTitle}"`;
        }
        return content || 'A task has been completed';
        
      case 'task-started':
        if (data && data.task && data.user) {
          const taskTitle = data.task.title || 'Unknown Task';
          const userName = data.user.name || 'Someone';
          return `${userName} started working on: "${taskTitle}"`;
        }
        return content || 'A task has been started';
        
      case 'task-progress':
        if (data && data.task && data.user) {
          const taskTitle = data.task.title || 'Unknown Task';
          const userName = data.user.name || 'Someone';
          const progress = data.task.progress || 0;
          return `${userName} updated progress on: "${taskTitle}" (${progress}%)`;
        }
        return content || 'Task progress updated';
        
      case 'task':
        if (data && data.task && data.user) {
          const taskTitle = data.task.title || 'Unknown Task';
          const userName = data.user.name || 'Someone';
          return `${userName} updated task: "${taskTitle}"`;
        }
        return content || 'A task has been updated';
        
      case 'message':
        if (data && data.user) {
          return `${data.user.name}: ${data.message || content}`;
        }
        return content || 'New message received';
        
      case 'user-joined':
        if (data && data.user) {
          return `${data.user.name} joined the group`;
        }
        return content || 'Someone joined the group';
        
      case 'file':
        if (data && data.user) {
          return `${data.user.name} shared a file`;
        }
        return content || 'New file shared';
        
      default:
        return content || 'New notification';
    }
  };

  return (
    <div className="notification-bar">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {getNotificationIcon(notification.type)}
            </span>
            <span className="notification-text">
              {formatNotificationContent(notification)}
            </span>
          </div>
          <button 
            onClick={() => onRemove(notification.id)}
            className="notification-close"
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationBar;
