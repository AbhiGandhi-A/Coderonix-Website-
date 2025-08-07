import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }
        navigate(`/editor/${roomId}`, {
            state: { username },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="home-page-wrapper-with-header">
            <div className="editor-nav-header">
                <div className="nav-container">
                    <Link to="/dashboard" className="back-link">
                        <span>←</span>
                        Back to Dashboard
                    </Link>
                    <div className="nav-user-info">
                        <span>Ready to code together?</span>
                    </div>
                </div>
            </div>
            
            <div className="home-main-content">
                <div className="home-container-centered">
                    <div className="form-wrapper">
                        <div className="logo-section">
                            <div className="logo">
                                <span className="logo-icon">💻</span>
                                <h1 className="logo-text">Coderonix</h1>
                            </div>
                            <p className="logo-subtitle">Collaborative Code Editor</p>
                        </div>
                        
                        <div className="form-content">
                            <h2 className="main-label">Join a Coding Session</h2>
                            <p className="sub-label">Enter room ID to start collaborating</p>
                            
                            <div className="input-group">
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        className="input-box"
                                        placeholder="Enter Room ID"
                                        onChange={(e) => setRoomId(e.target.value)}
                                        value={roomId}
                                        onKeyUp={handleInputEnter}
                                    />
                                    <span className="input-icon">🏠</span>
                                </div>
                                
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        className="input-box"
                                        placeholder="Enter Your Name"
                                        onChange={(e) => setUsername(e.target.value)}
                                        value={username}
                                        onKeyUp={handleInputEnter}
                                    />
                                    <span className="input-icon">👤</span>
                                </div>
                                
                                <button 
                                    className="btn join-btn" 
                                    onClick={joinRoom}
                                    disabled={!roomId.trim() || !username.trim()}
                                >
                                    <span>🚀</span>
                                    Join Room
                                </button>
                                
                                <div className="divider">
                                    <span>or</span>
                                </div>
                                
                                <button className="btn create-btn" onClick={createNewRoom}>
                                    <span>✨</span>
                                    Create New Room
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="features-section-below">
                    <div className="features-container">
                        <h3>Why Choose Coderonix?</h3>
                        <div className="features-grid-horizontal">
                            <div className="feature-card">
                                <span className="feature-icon">⚡</span>
                                <h4>Real-time Collaboration</h4>
                                <p>Code together in real-time with multiple developers</p>
                            </div>
                            <div className="feature-card">
                                <span className="feature-icon">🎯</span>
                                <h4>Live Cursors</h4>
                                <p>See where everyone is editing with live cursor tracking</p>
                            </div>
                            <div className="feature-card">
                                <span className="feature-icon">🎨</span>
                                <h4>Syntax Highlighting</h4>
                                <p>Beautiful syntax highlighting for multiple languages</p>
                            </div>
                            <div className="feature-card">
                                <span className="feature-icon">💾</span>
                                <h4>Auto Save</h4>
                                <p>Your code is automatically synchronized across all users</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <footer className="home-footer">
                <p>Built with ❤️ by Coderonix Team</p>
            </footer>
        </div>
    );
};

export default Home;
