import React, { useState, useEffect, useCallback } from 'react';

const ProjectManager = ({ user, socket }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    deadline: '',
    priority: 'medium',
    status: 'planning'
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium',
    status: 'todo'
  });

  const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, [selectedProject, SERVER_URL]);

  useEffect(() => {
    fetchProjects();
    
    if (socket) {
      socket.on('project-updated', (project) => {
        setProjects(prev => prev.map(p => p._id === project._id ? project : p));
      });
      
      socket.on('task-moved', (data) => {
        setProjects(prev => prev.map(project => {
          if (project._id === data.projectId) {
            return {
              ...project,
              tasks: project.tasks.map(task => 
                task._id === data.taskId ? { ...task, status: data.newStatus } : task
              )
            };
          }
          return project;
        }));
      });
    }

    return () => {
      if (socket) {
        socket.off('project-updated');
        socket.off('task-moved');
      }
    };
  }, [socket, fetchProjects]);

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...projectForm,
          group_id: user.group_id,
          created_by: user.id
        })
      });
      
      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [...prev, newProject]);
        setShowProjectModal(false);
        setProjectForm({
          name: '',
          description: '',
          deadline: '',
          priority: 'medium',
          status: 'planning'
        });
        // Refetch projects to update the sidebar and selected project
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const addTaskToProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/projects/${selectedProject._id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...taskForm,
          project_id: selectedProject._id,
          created_by: user.id
        })
      });
      
      if (response.ok) {
        const newTask = await response.json();
        setProjects(prev => prev.map(project => 
          project._id === selectedProject._id 
            ? { ...project, tasks: [...(project.tasks || []), newTask] }
            : project
        ));
        setSelectedProject(prev => ({
          ...prev,
          tasks: [...(prev.tasks || []), newTask]
        }));
        setShowTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          assignee: '',
          priority: 'medium',
          status: 'todo'
        });
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${SERVER_URL}/api/projects/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (socket) {
        socket.emit('task-moved', {
          projectId: selectedProject._id,
          taskId,
          newStatus
        });
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const getTasksByStatus = (status) => {
    if (!selectedProject || !selectedProject.tasks) return [];
    return selectedProject.tasks.filter(task => task.status === status);
  };

  const getProgressPercentage = (project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter(task => task.status === 'done').length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  return (
    <div className="project-manager">
      <div className="project-header">
        <h2>📁 Project Manager</h2>
        <div className="project-actions">
          <button 
            onClick={() => setShowProjectModal(true)}
            className="btn-primary"
          >
            ➕ New Project
          </button>
          {selectedProject && (
            <button 
              onClick={() => setShowTaskModal(true)}
              className="btn-secondary"
            >
              ➕ Add Task
            </button>
          )}
        </div>
      </div>

      <div className="project-layout">
        <div className="project-sidebar">
          <h3>Projects</h3>
          <div className="project-list">
            {projects.map(project => (
              <div 
                key={project._id}
                className={`project-item ${selectedProject?._id === project._id ? 'active' : ''}`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-name">{project.name}</div>
                <div className="project-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${getProgressPercentage(project)}%`}}
                    ></div>
                  </div>
                  <span className="progress-text">{getProgressPercentage(project)}%</span>
                </div>
                <div className={`project-status ${project.status}`}>
                  {project.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="project-main">
          {selectedProject ? (
            <>
              <div className="project-details">
                <h3>{selectedProject.name}</h3>
                <p>{selectedProject.description}</p>
                <div className="project-meta">
                  <span className={`priority ${selectedProject.priority}`}>
                    {selectedProject.priority} priority
                  </span>
                  <span className="deadline">
                    📅 {new Date(selectedProject.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="kanban-board">
                <div className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData('taskId');
                    moveTask(taskId, 'todo');
                  }}
                >
                  <div className="column-header todo">
                    <h4>📋 To Do ({getTasksByStatus('todo').length})</h4>
                  </div>
                  <div className="task-list">
                    {getTasksByStatus('todo').map(task => (
                      <div 
                        key={task._id} 
                        className="task-card"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task._id);
                          e.dataTransfer.setData('currentStatus', 'todo');
                        }}
                      >
                        <h5>{task.title}</h5>
                        <p>{task.description}</p>
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`}>
                            {task.priority}
                          </span>
                          <span className="assignee">
                            👤 {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData('taskId');
                    moveTask(taskId, 'in_progress');
                  }}
                >
                  <div className="column-header in-progress">
                    <h4>🔄 In Progress ({getTasksByStatus('in_progress').length})</h4>
                  </div>
                  <div className="task-list">
                    {getTasksByStatus('in_progress').map(task => (
                      <div 
                        key={task._id} 
                        className="task-card"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task._id);
                          e.dataTransfer.setData('currentStatus', 'in_progress');
                        }}
                      >
                        <h5>{task.title}</h5>
                        <p>{task.description}</p>
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`}>
                            {task.priority}
                          </span>
                          <span className="assignee">
                            👤 {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData('taskId');
                    moveTask(taskId, 'review');
                  }}
                >
                  <div className="column-header review">
                    <h4>👀 Review ({getTasksByStatus('review').length})</h4>
                  </div>
                  <div className="task-list">
                    {getTasksByStatus('review').map(task => (
                      <div 
                        key={task._id} 
                        className="task-card"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task._id);
                          e.dataTransfer.setData('currentStatus', 'review');
                        }}
                      >
                        <h5>{task.title}</h5>
                        <p>{task.description}</p>
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`}>
                            {task.priority}
                          </span>
                          <span className="assignee">
                            👤 {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kanban-column"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const taskId = e.dataTransfer.getData('taskId');
                    moveTask(taskId, 'done');
                  }}
                >
                  <div className="column-header done">
                    <h4>✅ Done ({getTasksByStatus('done').length})</h4>
                  </div>
                  <div className="task-list">
                    {getTasksByStatus('done').map(task => (
                      <div 
                        key={task._id} 
                        className="task-card completed"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task._id);
                          e.dataTransfer.setData('currentStatus', 'done');
                        }}
                      >
                        <h5>{task.title}</h5>
                        <p>{task.description}</p>
                        <div className="task-meta">
                          <span className={`priority ${task.priority}`}>
                            {task.priority}
                          </span>
                          <span className="assignee">
                            👤 {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-project-selected">
              <h3>Select a project to view details</h3>
              <p>Choose a project from the sidebar or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowProjectModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={createProject} className="project-form">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({...projectForm, deadline: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={projectForm.priority}
                    onChange={(e) => setProjectForm({...projectForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowProjectModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Task to {selectedProject?.name}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowTaskModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={addTaskToProject} className="task-form">
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Add Task
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)}
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

export default ProjectManager;