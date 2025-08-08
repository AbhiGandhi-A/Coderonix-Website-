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
  const [message, setMessage] = useState(null); // State for success/error messages

  // Define your backend URL using the environment variable
  const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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

  // Helper function to display messages
  const displayMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 5000); // Message disappears after 5 seconds
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching tasks for user role:', user.role);
      
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'leader' ? '/api/tasks' : '/api/tasks/my-tasks';
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.priority) queryParams.append('priority', filters.priority);
      if (filters.category) queryParams.append('category', filters.category);
      
      const url = `${SERVER_URL}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Fetch tasks response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const tasksArray = data.tasks || data; // Handle both paginated and non-paginated responses
      
      console.log('Fetched tasks:', tasksArray.length);
      setTasks(tasksArray);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      displayMessage('Failed to load tasks.', 'error'); // Use displayMessage
      setLoading(false);
    }
  }, [user.role, filters, SERVER_URL]);

  const fetchTaskStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/tasks/stats`, {
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
      // No message for stats fetch errors, as it's not critical for main functionality
    }
  }, [SERVER_URL]);

  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setMembers([data.leader, ...data.members]);
    } catch (error) {
      console.error('Error fetching members:', error);
      displayMessage('Failed to load group members.', 'error'); // Use displayMessage
    }
  }, [user.group_id, SERVER_URL]);

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
        console.log('Task updated:', data);
        fetchTasks();
        fetchTaskStats();
      });

      socket.on('task-progress-updated', (data) => {
        console.log('Task progress updated:', data);
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
  }, [socket, user.group_id, user.role, fetchTasks, fetchTaskStats, fetchMembers]);

  // Save time tracking to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`timeTracking_${user.group_id}`, JSON.stringify(timeTracking));
  }, [timeTracking, user.group_id]);

  const createTask = async (e) => {
    e.preventDefault();
    
    console.log('Creating task with data:', newTask);
    
    try {
      const token = localStorage.getItem('token');
      
      // Validate required fields on client side
      if (!newTask.title.trim() || !newTask.description.trim() || newTask.assigned_to.length === 0 || !newTask.deadline) {
        displayMessage('Please fill in all required fields: title, description, assigned members, and deadline.', 'error');
        return;
      }
      
      // Create FormData for file upload
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
      
      // Add attachments
      newTask.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      console.log('Sending request to create task...');

      const response = await fetch(`${SERVER_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header when using FormData, browser handles it
        },
        body: formData
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const task = await response.json();
        console.log('Task created successfully:', task);
        
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
        displayMessage('Task created successfully!', 'success'); // Use displayMessage
        
        if (socket) {
          socket.emit('task-update', { 
            group_id: user.group_id, 
            task: {
              _id: task._id,
              title: task.title,
              status: task.status,
              priority: task.priority
            },
            action: 'created',
            user: {
              _id: user._id,
              name: user.name
            }
          });
        }
      } else {
        // Try to parse error response
        let errorMessage = 'Failed to create task';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Server error response:', errorData);
        } catch (parseError) {
          // If response is not JSON (like HTML error page), get text
          try {
            const errorText = await response.text();
            console.error('Server error (non-JSON):', errorText);
            if (errorText.includes('<!DOCTYPE')) {
              errorMessage = 'Server error - please check server logs or network connection.';
            } else {
              errorMessage = errorText;
            }
          } catch (textError) {
            console.error('Could not parse error response:', textError);
          }
        }
        displayMessage(`Error creating task: ${errorMessage}`, 'error'); // Use displayMessage
      }
    } catch (error) {
      console.error('Network error creating task:', error);
      displayMessage(`Network error creating task: ${error.message}`, 'error'); // Use displayMessage
    }
  };

  const startTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}/status`, {
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

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(task =>
          task._id === taskId ? updatedTask : task
        ));

        // Start time tracking
        setTimeTracking(prev => ({
          ...prev,
          [taskId]: {
            startTime: Date.now(),
            totalTime: prev[taskId]?.totalTime || 0,
            isRunning: true
          }
        }));

        // Show task details modal
        setSelectedTask(updatedTask);
        setShowTaskModal(true);
        fetchTaskStats();
        displayMessage('Task started successfully!', 'success'); // Use displayMessage

        if (socket) {
          socket.emit('task-update', { 
            group_id: user.group_id, 
            task: {
              _id: updatedTask._id,
              title: updatedTask.title,
              status: updatedTask.status
            },
            action: 'started',
            user: {
              _id: user._id,
              name: user.name
            }
          });
        }
      } else {
        const errorData = await response.json();
        displayMessage(`Failed to start task: ${errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error starting task:', error);
      displayMessage('Network error starting task.', 'error');
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
    displayMessage('Task paused.', 'info');
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
    displayMessage('Task resumed.', 'success');
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem('token');
      const updateData = { status };
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user._id;
        pauseTask(taskId); // Pause time tracking when task is completed
      }

      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(task =>
          task._id === taskId ? updatedTask : task
        ));
        fetchTaskStats();
        displayMessage(`Task status updated to ${status}!`, 'success'); // Use displayMessage

        if (socket) {
          socket.emit('task-update', { 
            group_id: user.group_id, 
            task: {
              _id: updatedTask._id,
              title: updatedTask.title,
              status: updatedTask.status,
              completedBy: updatedTask.completedBy
            },
            action: status,
            user: {
              _id: user._id,
              name: user.name
            }
          });
        }
      } else {
        const errorData = await response.json();
        displayMessage(`Failed to update task status: ${errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      displayMessage('Network error updating task status.', 'error');
    }
  };

  const updateTaskProgress = async (taskId, progress) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(task =>
          task._id === taskId ? updatedTask : task
        ));

        setTaskProgress(prev => ({
          ...prev,
          [taskId]: progress
        }));
        displayMessage('Task progress updated!', 'success'); // Use displayMessage

        if (socket) {
          socket.emit('task-progress-update', {
            group_id: user.group_id,
            task: {
              _id: updatedTask._id,
              title: updatedTask.title,
              progress: updatedTask.progress
            },
            user: {
              _id: user._id,
              name: user.name
            }
          });
        }
      } else {
        const errorData = await response.json();
        displayMessage(`Failed to update task progress: ${errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      displayMessage('Network error updating task progress.', 'error');
    }
  };

  const addTaskComment = async (taskId, comment) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment })
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setTaskComments(prev => ({
          ...prev,
          [taskId]: [...(prev[taskId] || []), newCommentData]
        }));
        displayMessage('Comment added!', 'success'); // Use displayMessage

        if (socket) {
          socket.emit('task-comment', {
            group_id: user.group_id,
            taskId,
            comment: newCommentData,
            user: user.name
          });
        }
      } else {
        const errorData = await response.json();
        displayMessage(`Failed to add comment: ${errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      displayMessage('Network error adding comment.', 'error');
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
    const matchesSearch = filters.search ? task.title.toLowerCase().includes(filters.search.toLowerCase()) : true;
    const matchesStatus = filters.status ? task.status === filters.status : true;
    const matchesPriority = filters.priority ? task.priority === filters.priority : true;
    const matchesCategory = filters.category ? task.category === filters.category : true;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
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
          onChange={(e) => {
            setFilters({...filters, status: e.target.value});
            fetchTasks();
          }}
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
          onChange={(e) => {
            setFilters({...filters, priority: e.target.value});
            fetchTasks();
          }}
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
          onChange={(e) => {
            setFilters({...filters, category: e.target.value});
            fetchTasks();
          }}
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
                  <div className="time-display">
                    <Clock size={20} />
                    <span className="time-spent">
                      {formatTime(getCurrentTime(selectedTask._id))}
                    </span>
                  </div>
                  
                  {selectedTask.status === 'in_progress' && (
                    <div className="time-controls">
                      {timeTracking[selectedTask._id]?.isRunning ? (
                        <button
                          onClick={() => pauseTask(selectedTask._id)}
                          className="btn-secondary"
                        >
                          <Pause size={16} /> Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => resumeTask(selectedTask._id)}
                          className="btn-primary"
                        >
                          <Play size={16} /> Resume
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Tracking */}
                {selectedTask.status === 'in_progress' && (
                  <div className="progress-section">
                    <h4>Progress</h4>
                    <div className="progress-controls">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={taskProgress[selectedTask._id] || selectedTask.progress || 0}
                        onChange={(e) => {
                          const progress = parseInt(e.target.value);
                          setTaskProgress(prev => ({
                            ...prev,
                            [selectedTask._id]: progress
                          }));
                        }}
                        onMouseUp={(e) => {
                          const progress = parseInt(e.target.value);
                          updateTaskProgress(selectedTask._id, progress);
                        }}
                        className="progress-slider"
                      />
                      <span className="progress-value">
                        {taskProgress[selectedTask._id] || selectedTask.progress || 0}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${taskProgress[selectedTask._id] || selectedTask.progress || 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div className="comments-section">
                  <h4>Comments & Updates</h4>
                  <div className="comments-list">
                    {(selectedTask.comments || []).map((comment, index) => (
                      <div key={index} className={`comment ${comment.is_automatic ? 'automatic' : ''}`}>
                        <div className="comment-header">
                          <span className="comment-author">{comment.author?.name || 'System'}</span>
                          <span className="comment-time">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="comment-content">{comment.comment}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="add-comment">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows="3"
                    />
                    <button
                      onClick={() => {
                        if (newComment.trim()) {
                          addTaskComment(selectedTask._id, newComment);
                          setNewComment('');
                        }
                      }}
                      className="btn-primary"
                      disabled={!newComment.trim()}
                    >
                      Add Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              {selectedTask.status !== 'completed' && (
                <>
                  <button
                    onClick={() => updateTaskStatus(selectedTask._id, 'completed')}
                    className="btn-success"
                  >
                    <CheckCircle size={16} /> Mark Complete
                  </button>
                  {selectedTask.status === 'in_progress' && (
                    <button
                      onClick={() => updateTaskStatus(selectedTask._id, 'pending')}
                      className="btn-secondary"
                    >
                      <RotateCcw size={16} /> Reset to Pending
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setShowTaskModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Grid */}
      <div className="tasks-grid">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks found. {user.role === 'leader' ? 'Create your first task!' : 'Wait for tasks to be assigned.'}</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task._id} className={`task-card ${task.status}`}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-badges">
                  <span 
                    className="priority-badge" 
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  >
                    {task.priority}
                  </span>
                  <span className={`status-badge ${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  {task.isOverdue && (
                    <span className="overdue-badge">
                      <AlertCircle size={12} />
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              
              <p className="task-description">{task.description}</p>
              
              {/* Category and Tags */}
              <div className="task-meta-tags">
                <span className="category-tag">{task.category}</span>
                {task.tags && task.tags.map(tag => (
                  <span key={tag} className="tag small">
                    <Tag size={10} />
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Progress Bar */}
              {task.status === 'in_progress' && (
                <div className="task-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{task.progress || 0}% complete</span>
                </div>
              )}

              {/* Time Tracking Display */}
              {timeTracking[task._id] && (
                <div className="task-time">
                  <Clock size={16} />
                  <span>{formatTime(getCurrentTime(task._id))}</span>
                  {timeTracking[task._id].isRunning && (
                    <span className="time-running">● Running</span>
                  )}
                </div>
              )}
              
              <div className="task-meta">
                <div className="assigned-to">
                  <strong>Assigned to:</strong>
                  <div className="assignee-list">
                    {task.assigned_to.map(assignee => (
                      <span key={assignee._id} className="assignee-tag">
                        {assignee.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="task-deadline">
                  <strong>Deadline:</strong> {new Date(task.deadline).toLocaleDateString()}
                </div>
                
                <div className="task-creator">
                  <strong>Created by:</strong> {task.created_by.name}
                </div>

                {task.estimated_hours > 0 && (
                  <div className="task-hours">
                    <strong>Estimated:</strong> {task.estimated_hours}h
                  </div>
                )}
              </div>

              {user.role === 'member' && task.assigned_to.some(a => a._id === user._id) && (
                <div className="task-actions">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => startTask(task._id)}
                      className="btn-primary"
                    >
                      <Play size={16} /> Start Task
                    </button>
                  )}
                  
                  {task.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                        className="btn-secondary"
                      >
                        <FileText size={16} /> View Details
                      </button>
                      <button
                        onClick={() => updateTaskStatus(task._id, 'completed')}
                        className="btn-success"
                      >
                        <CheckCircle size={16} /> Complete
                      </button>
                    </>
                  )}
                  
                  {task.status === 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                      className="btn-secondary"
                    >
                      <FileText size={16} /> View Details
                    </button>
                  )}
                </div>
              )}

              {user.role === 'leader' && (
                <div className="task-actions">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }}
                    className="btn-secondary"
                  >
                    <FileText size={16} /> View Details
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskManager;
