// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, MessageCircle, FolderOpen, Users, Code2, Bell, User, LogOut, Wifi, WifiOff, AlertCircle, RotateCcw, Crown, UserCheck, Activity, CalendarDays, BarChart2 } from 'lucide-react';
import TaskManager from '../components/TaskManager';
import ChatComponent from '../components/ChatComponent';
import FileManager from '../components/FileManager';
import MemberManager from '../components/MemberManager';
import NotificationBar from '../components/NotificationBar';
import Calendar from '../components/Calendar';
import Analytics from '../components/Analytics';
import Folders from '../components/Folders'; // 💡 ADD THIS LINE
import io from 'socket.io-client';

const Dashboard = ({ user, logout }) => {
    const [activeTab, setActiveTab] = useState('tasks');
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    // 💡 Define the server URL using your network IP
    const SERVER_URL = 'http://192.168.1.15:5000';

    useEffect(() => {
        console.log('🚀 Dashboard mounting, creating socket connection...');
        console.log('User:', user);
        
        // 💡 Use the SERVER_URL constant here
        const newSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true,
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            maxReconnectionAttempts: 5
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('✅ Dashboard: Socket connected:', newSocket.id);
            setConnectionStatus('connected');
            if (user && user.group_id) {
                newSocket.emit('join-group', { groupId: user.group_id, userId: user._id, name: user.name });
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Dashboard: Socket disconnected:', reason);
            setConnectionStatus('disconnected');
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Dashboard: Connection error:', error);
            setConnectionStatus('error');
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Dashboard: Reconnected after', attemptNumber, 'attempts');
            setConnectionStatus('connected');
            if (user && user.group_id) {
                newSocket.emit('join-group', { groupId: user.group_id, userId: user._id, name: user.name });
            }
        });

        newSocket.on('reconnecting', (attemptNumber) => {
            console.log('🔄 Dashboard: Reconnecting attempt', attemptNumber);
            setConnectionStatus('reconnecting');
        });

        newSocket.on('reconnect_error', (error) => {
            console.error('❌ Dashboard: Reconnection error:', error);
            setConnectionStatus('error');
        });

        newSocket.on('reconnect_failed', () => {
            console.error('❌ Dashboard: Reconnection failed');
            setConnectionStatus('failed');
        });

        newSocket.on('new-message', (message) => {
            console.log('📨 Dashboard: New message notification:', message);
            if (activeTab !== 'chat') {
                setNotifications(prev => [...prev, {
                    id: Date.now(),
                    type: 'message',
                    content: `New message from ${message.sender_id.name}`,
                    timestamp: new Date()
                }]);
            }
        });

        newSocket.on('task-updated', (task) => {
            console.log('📋 Dashboard: Task updated:', task);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'task',
                content: `Task "${task.title}" has been updated`,
                timestamp: new Date()
            }]);
        });

        newSocket.on('file-shared', (file) => {
            console.log('📁 Dashboard: File shared:', file);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'file',
                content: `New file shared: ${file.file_name}`,
                timestamp: new Date()
            }]);
        });

        newSocket.on('event-created', (event) => {
            console.log('📅 Dashboard: Event created:', event);
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'event',
                content: `New event scheduled: ${event.title}`,
                timestamp: new Date()
            }]);
        });
        
        // Add listener for analytics updates
        newSocket.on('analytics-update', (data) => {
            console.log('📈 Dashboard: Analytics data updated:', data);
        });

        newSocket.on('join-error', (error) => {
            console.error('❌ Join error:', error);
            alert(`Failed to join chat: ${error.error}`);
        });

        return () => {
            console.log('🧹 Dashboard: Cleaning up socket connection');
            if (newSocket) {
                newSocket.removeAllListeners();
                newSocket.disconnect();
            }
        };
    }, [user.group_id, activeTab]);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return '#4ade80';
            case 'connecting':
            case 'reconnecting': return '#fbbf24';
            case 'disconnected':
            case 'error':
            case 'failed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getConnectionStatusIcon = () => {
        switch (connectionStatus) {
            case 'connected': return <Wifi size={16} />;
            case 'connecting': return <Activity size={16} className="animate-pulse" />;
            case 'reconnecting': return <RotateCcw size={16} className="animate-spin" />;
            case 'disconnected': return <WifiOff size={16} />;
            case 'error':
            case 'failed': return <AlertCircle size={16} />;
            default: return <WifiOff size={16} />;
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return 'Connected';
            case 'connecting': return 'Connecting...';
            case 'reconnecting': return 'Reconnecting...';
            case 'disconnected': return 'Disconnected';
            case 'error': return 'Connection Error';
            case 'failed': return 'Connection Failed';
            default: return 'Unknown';
        }
    };

    const getRoleIcon = () => {
        return user.role === 'leader' ? <Crown size={16} /> : <UserCheck size={16} />;
    };

    return (
        <div className="dashboard">
            <NotificationBar 
                notifications={notifications}
                onRemove={removeNotification}
            />
            
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-left">
                        <div className="brand-section">
                            <h1>Codronix</h1>
                            <div className="user-role">
                                {getRoleIcon()}
                                <span>{user.role === 'leader' ? 'Group Leader' : 'Member'}</span>
                            </div>
                        </div>
                        <div className="connection-status" style={{ color: getConnectionStatusColor() }}>
                            {getConnectionStatusIcon()}
                            <span>{getConnectionStatusText()}</span>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="user-info">
                            <User size={18} />
                            <span className="user-name">Welcome, {user.name}</span>
                        </div>
                        <Link to="/profile" className="btn-secondary">
                            <User size={16} />
                            Profile
                        </Link>
                        <button onClick={logout} className="btn-danger">
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <nav className="dashboard-nav">
                <div className="container">
                    <div className="nav-tabs">
                        <button 
                            className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tasks')}
                        >
                            <CheckSquare size={20} />
                            <span>Tasks</span>
                            {notifications.filter(n => n.type === 'task').length > 0 && (
                                <div className="notification-badge">
                                    {notifications.filter(n => n.type === 'task').length}
                                </div>
                            )}
                        </button>
                        
                        <button 
                            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageCircle size={20} />
                            <span>Chat</span>
                            {notifications.filter(n => n.type === 'message').length > 0 && (
                                <div className="notification-badge">
                                    {notifications.filter(n => n.type === 'message').length}
                                </div>
                            )}
                        </button>
                        
                        <button 
                            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                            onClick={() => setActiveTab('calendar')}
                        >
                            <CalendarDays size={20} />
                            <span>Calendar</span>
                            {notifications.filter(n => n.type === 'event').length > 0 && (
                                <div className="notification-badge">
                                    {notifications.filter(n => n.type === 'event').length}
                                </div>
                            )}
                        </button>
                        
                        <button 
                            className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <BarChart2 size={20} />
                            <span>Analytics</span>
                        </button>

                        {/* 💡 Renamed 'Files' tab to 'File Manager' to avoid confusion with the new 'Folders' feature */}
                        <button 
                            className={`nav-tab ${activeTab === 'files' ? 'active' : ''}`}
                            onClick={() => setActiveTab('files')}
                        >
                            <FolderOpen size={20} />
                            <span>File Manager</span>
                            {notifications.filter(n => n.type === 'file').length > 0 && (
                                <div className="notification-badge">
                                    {notifications.filter(n => n.type === 'file').length}
                                </div>
                            )}
                        </button>

                        {/* 💡 NEW 'Folders' TAB */}
                        <button 
                            className={`nav-tab ${activeTab === 'folders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('folders')}
                        >
                            <FolderOpen size={20} />
                            <span>Folders</span>
                        </button>
                        
                        {user.role === 'leader' && (
                            <button 
                                className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`}
                                onClick={() => setActiveTab('members')}
                            >
                                <Users size={20} />
                                <span>Members</span>
                            </button>
                        )}
                        
                        <button 
                            className={`nav-tab ${activeTab === 'code' ? 'active' : ''}`}
                            onClick={() => setActiveTab('code')}
                        >
                            <Code2 size={20} />
                            <span>Code Editor</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="dashboard-main">
                <div className="container">
                    {activeTab === 'tasks' && (
                        <TaskManager user={user} socket={socket} />
                    )}
                    {activeTab === 'chat' && (
                        <ChatComponent user={user} socket={socket} />
                    )}
                    {activeTab === 'calendar' && (
                        <Calendar user={user} socket={socket} />
                    )}
                    {activeTab === 'analytics' && (
                        <Analytics user={user} socket={socket} />
                    )}
                    {activeTab === 'files' && (
                        <FileManager user={user} socket={socket} />
                    )}
                    
                    {/* 💡 NEW CONDITIONAL RENDERING FOR FOLDERS COMPONENT */}
                    {activeTab === 'folders' && (
                        <Folders user={user} socket={socket} />
                    )}

                    {activeTab === 'members' && user.role === 'leader' && (
                        <MemberManager user={user} />
                    )}
                    {activeTab === 'code' && (
                        <div className="code-editor-redirect">
                            <div className="redirect-content">
                                <Code2 size={48} className="redirect-icon" />
                                <h2>Live Code Editor</h2>
                                <p>Collaborate with your team members in real-time code editing sessions.</p>
                                <Link to="/editor-home" className="btn-primary">
                                    <Code2 size={18} />
                                    Launch Code Editor
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;