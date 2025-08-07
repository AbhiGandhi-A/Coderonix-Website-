import React, { useState, useEffect } from 'react';

const TaskManager = ({ user, socket }) => {
  const [tasks, setTasks] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: [],
    deadline: ''
  });

  useEffect(() => {
    fetchTasks();
    if (user.role === 'leader') {
      fetchMembers();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = user.role === 'leader' ? '/api/tasks' : '/api/tasks/my-tasks';
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setMembers([data.leader, ...data.members]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        const task = await response.json();
        setTasks([task, ...tasks]);
        setNewTask({ title: '', description: '', assigned_to: [], deadline: '' });
        setShowCreateForm(false);
        
        if (socket) {
          socket.emit('task-update', { group_id: user.group_id, task });
        }
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(tasks.map(task => 
          task._id === taskId ? updatedTask : task
        ));
        
        if (socket) {
          socket.emit('task-update', { group_id: user.group_id, task: updatedTask });
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
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

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-manager">
      <div className="task-header">
        <h2>{user.role === 'leader' ? 'All Tasks' : 'My Tasks'}</h2>
        {user.role === 'leader' && (
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="btn-primary"
          >
            Create New Task
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Task</h3>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={createTask} className="task-form">
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label>Assign To</label>
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

              <div className="form-group">
                <label>Deadline</label>
                <input
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Create Task</button>
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

      <div className="tasks-grid">
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet. {user.role === 'leader' ? 'Create your first task!' : 'Wait for tasks to be assigned.'}</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task._id} className={`task-card ${task.status}`}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <span className={`status-badge ${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              
              <p className="task-description">{task.description}</p>
              
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
              </div>

              {user.role === 'member' && task.assigned_to.some(a => a._id === user.id) && (
                <div className="task-actions">
                  <button 
                    onClick={() => updateTaskStatus(task._id, 'in_progress')}
                    className="btn-secondary"
                    disabled={task.status === 'completed'}
                  >
                    Start Task
                  </button>
                  <button 
                    onClick={() => updateTaskStatus(task._id, 'completed')}
                    className="btn-success"
                    disabled={task.status === 'completed'}
                  >
                    Mark Complete
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