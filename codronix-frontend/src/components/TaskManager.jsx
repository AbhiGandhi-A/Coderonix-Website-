import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, Calendar, MessageSquare, FileText, CheckCircle, Play, Pause, RotateCcw, Plus, X, Upload, Tag, AlertCircle, Star, Filter, Search } from 'lucide-react';

const TaskManager = ({ user, socket }) => {
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskProgress, setTaskProgress] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [timeTracking, setTimeTracking] = useState({});
  const [taskStats, setTaskStats] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: ''
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: [],
    deadline: '',
    priority: 'medium',
    category: 'other',
    tags: [],
    estimated_hours: '',
    reminder_date: '',
    attachments: []
  });

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'urgent', label: 'Urgent', color: '#dc2626' }
  ];

  const categoryOptions = [
    { value: 'development', label: 'Development' },
    { value: 'design', label: 'Design' },
    { value: 'testing', label: 'Testing' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'research', label: 'Research' },
    { value: 'other', label: 'Other' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Memoized fetch functions to prevent unnecessary re-creations
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'leader' ? '/api/tasks' : '/api/tasks/my-tasks';
      
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.category) queryParams.append('category', filters.category);
      
      const url = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const tasksArray = data.tasks || data;
      
      setTasks(tasksArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  }, [user.role, filters]);

  const fetchTaskStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const stats = await response.json();
        setTaskStats(stats);
      }
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch members: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setMembers([data.leader, ...data.members]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, [user.group_id]);


  // Effect hook to load data on component mount and filter changes
  useEffect(() => {
    fetchTasks();
    fetchTaskStats();
    if (user.role === 'leader') {
      fetchMembers();
    }
    
    // Load time tracking from localStorage
    const savedTimeTracking = localStorage.getItem(`timeTracking_${user.group_id}`);
    if (savedTimeTracking) {
      setTimeTracking(JSON.parse(savedTimeTracking));
    }

    if (socket) {
      socket.on('task-updated', (data) => {
        fetchTasks();
        fetchTaskStats();
      });

      socket.on('task-progress-updated', (data) => {
        setTaskProgress(prev => ({
          ...prev,
          [data.task._id]: data.task.progress
        }));
      });

      return () => {
        socket.off('task-updated');
        socket.off('task-progress-updated');
      };
    }
  }, [socket, user.group_id, user.role, fetchTasks, fetchMembers, fetchTaskStats]);

  // Effect hook to save time tracking to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`timeTracking_${user.group_id}`, JSON.stringify(timeTracking));
  }, [timeTracking, user.group_id]);

  const handleResponse = async (response, successMessage) => {
    if (response.ok) {
      const data = await response.json();
      console.log(successMessage, data);
      return data;
    } else {
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const errorData = isJson ? await response.json() : await response.text();
      const errorMessage = isJson ? (errorData.message || 'Unknown error') : errorData;
      throw new Error(errorMessage);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (!newTask.title.trim() || !newTask.description.trim() || newTask.assigned_to.length === 0 || !newTask.deadline) {
        alert('Please fill in all required fields: title, description, assigned members, and deadline.');
        return;
      }
      
      const formData = new FormData();
      formData.append('title', newTask.title.trim());
      formData.append('description', newTask.description.trim());
      formData.append('assigned_to', JSON.stringify(newTask.assigned_to));
      formData.append('deadline', newTask.deadline);
      formData.append('priority', newTask.priority);
      formData.append('category', newTask.category);
      formData.append('tags', JSON.stringify(newTask.tags));
      formData.append('estimated_hours', newTask.estimated_hours || '0');
      if (newTask.reminder_date) {
        formData.append('reminder_date', newTask.reminder_date);
      }
      
      newTask.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const task = await handleResponse(response, 'Task created successfully:');
      
      setTasks([task, ...tasks]);
      setNewTask({
        title: '',
        description: '',
        assigned_to: [],
        deadline: '',
        priority: 'medium',
        category: 'other',
        tags: [],
        estimated_hours: '',
        reminder_date: '',
        attachments: []
      });
      setShowCreateForm(false);
      fetchTaskStats();
      
      if (socket) {
        socket.emit('task-update', { 
          group_id: user.group_id, 
          task: { _id: task._id, title: task.title, status: task.status, priority: task.priority },
          action: 'created',
          user: { _id: user._id, name: user.name }
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert(`Error creating task: ${error.message}`);
    }
  };

  const startTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
          started_by: user._id
        })
      });

      const updatedTask = await handleResponse(response, 'Task started successfully:');

      setTasks(tasks.map(task => task._id === taskId ? updatedTask : task));

      setTimeTracking(prev => ({
        ...prev,
        [taskId]: {
          startTime: Date.now(),
          totalTime: prev[taskId]?.totalTime || 0,
          isRunning: true
        }
      }));

      setSelectedTask(updatedTask);
      setShowTaskModal(true);
      fetchTaskStats();

      if (socket) {
        socket.emit('task-update', { 
          group_id: user.group_id, 
          task: { _id: updatedTask._id, title: updatedTask.title, status: updatedTask.status },
          action: 'started',
          user: { _id: user._id, name: user.name }
        });
      }
    } catch (error) {
      console.error('Error starting task:', error);
      alert(`Error starting task: ${error.message}`);
    }
  };

  const pauseTask = (taskId) => {
    setTimeTracking(prev => {
      const current = prev[taskId];
      if (current && current.isRunning) {
        const sessionTime = Date.now() - current.startTime;
        return {
          ...prev,
          [taskId]: {
            ...current,
            totalTime: current.totalTime + sessionTime,
            isRunning: false,
            startTime: null
          }
        };
      }
      return prev;
    });
  };

  const resumeTask = (taskId) => {
    setTimeTracking(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        startTime: Date.now(),
        isRunning: true
      }
    }));
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem('token');
      const updateData = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user._id;
        pauseTask(taskId);
      }

      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const updatedTask = await handleResponse(response, 'Task status updated successfully:');

      setTasks(tasks.map(task => task._id === taskId ? updatedTask : task));
      fetchTaskStats();

      if (socket) {
        socket.emit('task-update', { 
          group_id: user.group_id, 
          task: { _id: updatedTask._id, title: updatedTask.title, status: updatedTask.status, completedBy: updatedTask.completedBy },
          action: status,
          user: { _id: user._id, name: user.name }
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(`Error updating task status: ${error.message}`);
    }
  };

  const updateTaskProgress = async (taskId, progress) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress })
      });

      const updatedTask = await handleResponse(response, 'Task progress updated successfully:');

      setTasks(tasks.map(task => task._id === taskId ? updatedTask : task));

      setTaskProgress(prev => ({
        ...prev,
        [taskId]: progress
      }));

      if (socket) {
        socket.emit('task-progress-update', {
          group_id: user.group_id,
          task: { _id: updatedTask._id, title: updatedTask.title, progress: updatedTask.progress },
          user: { _id: user._id, name: user.name }
        });
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      alert(`Error updating task progress: ${error.message}`);
    }
  };

  const addTaskComment = async (taskId, comment) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      const newCommentData = await handleResponse(response, 'Comment added successfully:');
      
      setTaskComments(prev => ({
        ...prev,
        [taskId]: [...(prev[taskId] || []), newCommentData]
      }));

      if (socket) {
        socket.emit('task-comment', {
          group_id: user.group_id,
          taskId,
          comment: newCommentData,
          user: user.name
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(`Error adding comment: ${error.message}`);
    }
  };

  const toggleMemberAssignment = (memberId) => {
    const isAssigned = newTask.assigned_to.includes(memberId);
    if (isAssigned) {
      setNewTask({
        ...newTask,
        assigned_to: newTask.assigned_to.filter(id => id !== memberId)
      });
    } else {
      setNewTask({
        ...newTask,
        assigned_to: [...newTask.assigned_to, memberId]
      });
    }
  };

  const addTag = (tagText) => {
    if (tagText.trim() && !newTask.tags.includes(tagText.trim())) {
      setNewTask({
        ...newTask,
        tags: [...newTask.tags, tagText.trim()]
      });
    }
  };

  const removeTag = (tagToRemove) => {
    setNewTask({
      ...newTask,
      tags: newTask.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewTask({
      ...newTask,
      attachments: [...newTask.attachments, ...files]
    });
  };

  const removeAttachment = (index) => {
    setNewTask({
      ...newTask,
      attachments: newTask.attachments.filter((_, i) => i !== index)
    });
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentTime = (taskId) => {
    const tracking = timeTracking[taskId];
    if (!tracking) return 0;
    
    let totalTime = tracking.totalTime;
    if (tracking.isRunning && tracking.startTime) {
      totalTime += Date.now() - tracking.startTime;
    }
    
    return totalTime;
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorityOptions.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : '#6b7280';
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-manager">
      <div className="task-header">
        <div>
          <h2>{user.role === 'leader' ? 'All Tasks' : 'My Tasks'}</h2>
          {/* Task Statistics */}
          <div className="task-stats">
            <div className="stat-item">
              <span className="stat-number">{taskStats.total || 0}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{taskStats.pending || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{taskStats.in_progress || 0}</span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{taskStats.completed || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
            {taskStats.overdue > 0 && (
              <div className="stat-item overdue">
                <span className="stat-number">{taskStats.overdue}</span>
                <span className="stat-label">Overdue</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          {user.role === 'leader' && (
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              <Plus size={16} /> Create Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="task-filters">
        <div className="filter-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="search-input"
          />
        </div>
        
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="filter-select"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({...filters, priority: e.target.value})}
          className="filter-select"
        >
          <option value="">All Priorities</option>
          {priorityOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Enhanced Create Task Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal create-task-modal">
            <div className="modal-header">
              <h3>Create New Task</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={createTask} className="task-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  >
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Describe the task in detail"
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Assign To *</label>
                <div className="member-selection">
                  {members.map(member => (
                    <label key={member._id} className="member-checkbox">
                      <input
                        type="checkbox"
                        checked={newTask.assigned_to.includes(member._id)}
                        onChange={() => toggleMemberAssignment(member._id)}
                      />
                      <span>{member.name} ({member.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Deadline *</label>
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reminder Date</label>
                  <input
                    type="datetime-local"
                    value={newTask.reminder_date}
                    onChange={(e) => setNewTask({...newTask, reminder_date: e.target.value})}
                  />
                </div>
              </div>

              {/* Tags Section */}
              <div className="form-group">
                <label>Tags</label>
                <div className="tags-input">
                  <div className="tags-list">
                    {newTask.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        <Tag size={12} />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="tag-remove"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tag and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* File Attachments */}
              <div className="form-group">
                <label>Attachments</label>
                <div className="file-upload">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="file-input"
                    id="task-attachments"
                  />
                  <label htmlFor="task-attachments" className="file-upload-label">
                    <Upload size={16} />
                    Choose Files
                  </label>
                  
                  {newTask.attachments.length > 0 && (
                    <div className="attachment-list">
                      {newTask.attachments.map((file, index) => (
                        <div key={index} className="attachment-item">
                          <span>{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="attachment-remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Modal - keeping existing implementation */}
      {showTaskModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal task-details-modal">
            <div className="modal-header">
              <h3>{selectedTask.title}</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="task-details-content">
                <div className="task-info-section">
                  <h4>Task Information</h4>
                  <p><strong>Description:</strong> {selectedTask.description}</p>
                  <p><strong>Priority:</strong> 
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: getPriorityColor(selectedTask.priority) }}
                    >
                      {selectedTask.priority}
                    </span>
                  </p>
                  <p><strong>Category:</strong> {selectedTask.category}</p>
                  <p><strong>Deadline:</strong> {new Date(selectedTask.deadline).toLocaleString()}</p>
                  <p><strong>Status:</strong> 
                    <span className={`status-badge ${selectedTask.status}`}>
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                  </p>
                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <p><strong>Tags:</strong> 
                      {selectedTask.tags.map(tag => (
                        <span key={tag} className="tag small">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {/* Time Tracking */}
                <div className="time-tracking-section">
                  <h4>Time Tracking</h4>
                  {/* ... (rest of the modal content) */}
                </div>
                {/* ... (rest of the modal content) */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;