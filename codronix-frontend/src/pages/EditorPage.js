// src/components/EditorPage.js
import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../shared/Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef('');
    const location = useLocation();
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // 💡 Define the server URL using your network IP
    const SERVER_URL = 'http://.1.15:5000';

    useEffect(() => {
        const init = async () => {
            try {
                // 💡 Pass the SERVER_URL to the initSocket function
                socketRef.current = await initSocket(SERVER_URL);
                
                socketRef.current.on('connect', () => {
                    setIsConnected(true);
                    toast.success('Connected to server');

                    if (location.state?.username) {
                        socketRef.current.emit(ACTIONS.JOIN, {
                            roomId,
                            username: location.state.username,
                        });
                    }
                });

                socketRef.current.on('disconnect', () => {
                    setIsConnected(false);
                    toast.error('Disconnected from server');
                });

                function handleErrors(err) {
                    console.error('Socket error:', err);
                    toast.error('Socket connection failed. Try again.');
                    navigate('/editor-home');
                }

                socketRef.current.on('connect_error', handleErrors);
                socketRef.current.on('connect_failed', handleErrors);

                socketRef.current.on(
                    ACTIONS.JOINED,
                    ({ clients: connectedClients, username, socketId }) => {
                        if (username !== location.state?.username) {
                            toast.success(`${username} joined the room.`);
                        }
                        setClients(connectedClients);
                        socketRef.current.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            socketId,
                        });
                    }
                );

                socketRef.current.on(
                    ACTIONS.DISCONNECTED,
                    ({ socketId, username }) => {
                        toast.success(`${username} left the room.`);
                        setClients((prev) =>
                            prev.filter((client) => client.socketId !== socketId)
                        );
                    }
                );
            } catch (err) {
                console.error(err);
                toast.error('Connection failed!');
                navigate('/editor-home');
            }
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.CODE_CHANGE);
                socketRef.current.off(ACTIONS.CURSOR_CHANGE);
                socketRef.current.off('connect_error');
                socketRef.current.off('connect_failed');
            }
        };
    }, [location.state?.username, navigate, roomId]);

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    };

    const leaveRoom = () => {
        toast.success('You left the room');
        navigate('/editor-home');
    };

    if (!location.state) {
        return <Navigate to="/editor-home" />;
    }

    const uniqueClients = Array.from(
        new Map(clients.map((c) => [c.username, c])).values()
    );

    return (
        <div className="editor-page">
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">💻</span>
                        <span className="logo-text">Coderonix</span>
                    </div>
                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>

                <div className="room-info">
                    <h3>Room Details</h3>
                    <div className="room-id-section">
                        <label>Room ID</label>
                        <div className="room-id-display">
                            <code className="room-id">{roomId}</code>
                            <button className="copy-btn" onClick={copyRoomId} title="Copy Room ID">
                                📋
                            </button>
                        </div>
                    </div>
                </div>

                <div className="clients-section">
                    <h3>Connected Users ({uniqueClients.length})</h3>
                    <div className="clients-list">
                        {uniqueClients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                                socketId={client.socketId}
                            />
                        ))}
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="btn leave-btn" onClick={leaveRoom}>
                        <span>🚪</span>
                        Leave Room
                    </button>
                </div>
            </div>

            <div className="editor-section">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    clients={clients}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
            </div>
        </div>
    );
};

export default EditorPage;