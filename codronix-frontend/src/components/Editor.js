import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import ACTIONS from '../shared/Actions';

const Editor = ({ socketRef, roomId, onCodeChange, clients }) => {
    const editorRef = useRef(null);
    const cursorsRef = useRef({});
    const selectionsRef = useRef({});
    const userColorsRef = useRef({});
    const lastCursorActivity = useRef(0);

    // Generate consistent colors for users
    const getColorForUser = (socketId) => {
        if (userColorsRef.current[socketId]) {
            return userColorsRef.current[socketId];
        }
        
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
            '#F1948A', '#85C1E9', '#F8C471', '#82E0AA'
        ];
        
        const hash = socketId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const color = colors[Math.abs(hash) % colors.length];
        userColorsRef.current[socketId] = color;
        return color;
    };

    useEffect(() => {
        editorRef.current = Codemirror.fromTextArea(
            document.getElementById('realtimeEditor'),
            {
                mode: { name: 'javascript', json: true },
                theme: 'dracula',
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
                styleActiveLine: true,
                matchBrackets: true,
                indentUnit: 2,
                tabSize: 2,
                lineWrapping: true,
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                extraKeys: {
                    "Ctrl-Space": "autocomplete",
                    "F11": function(cm) {
                        cm.setOption("fullScreen", !cm.getOption("fullScreen"));
                    },
                    "Esc": function(cm) {
                        if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
                    }
                }
            }
        );

        // Handle code changes
        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes;
            const code = instance.getValue();
            onCodeChange(code);
            
            if (origin !== 'setValue' && socketRef.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }
        });

        // Handle cursor position changes with throttling
        editorRef.current.on('cursorActivity', (instance) => {
            const now = Date.now();
            if (now - lastCursorActivity.current < 100) return; // Throttle to 100ms
            lastCursorActivity.current = now;

            const cursor = instance.getCursor();
            const selection = instance.getSelection();
            const selectionRange = instance.listSelections()[0];
            
            if (socketRef.current) {
                socketRef.current.emit(ACTIONS.CURSOR_CHANGE, {
                    roomId,
                    cursor,
                    selection,
                    selectionRange,
                    socketId: socketRef.current.id
                });
            }
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }
        };
    }, []);

    // Handle incoming code changes
    useEffect(() => {
        if (!socketRef.current) return;

        const handleCodeChange = ({ code }) => {
            if (code !== null && editorRef.current) {
                const currentCursor = editorRef.current.getCursor();
                const scrollInfo = editorRef.current.getScrollInfo();
                
                editorRef.current.setValue(code);
                editorRef.current.setCursor(currentCursor);
                editorRef.current.scrollTo(scrollInfo.left, scrollInfo.top);
                
                onCodeChange(code);
            }
        };

        socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
        };
    }, [socketRef.current]);

    // Handle cursor changes from other users
    useEffect(() => {
        if (!socketRef.current) return;

        const handleCursorChange = ({ cursor, selection, selectionRange, socketId, username }) => {
            if (socketId === socketRef.current.id || !editorRef.current) return;

            const userColor = getColorForUser(socketId);
            
            // Clear existing cursor and selection for this user
            if (cursorsRef.current[socketId]) {
                cursorsRef.current[socketId].clear();
            }
            if (selectionsRef.current[socketId]) {
                selectionsRef.current[socketId].clear();
            }

            try {
                // Create cursor element
                const cursorElement = document.createElement('div');
                cursorElement.className = 'remote-cursor';
                cursorElement.style.borderLeftColor = userColor;
                
                // Create username label
                const cursorLabel = document.createElement('div');
                cursorLabel.className = 'cursor-label';
                cursorLabel.textContent = username || `User ${socketId.slice(-4)}`;
                cursorLabel.style.backgroundColor = userColor;
                cursorElement.appendChild(cursorLabel);

                // Position cursor
                const cursorWidget = editorRef.current.setBookmark(cursor, {
                    widget: cursorElement,
                    insertLeft: true
                });

                cursorsRef.current[socketId] = cursorWidget;

                // Handle selection if exists
                if (selectionRange && selectionRange.anchor && selectionRange.head) {
                    const { anchor, head } = selectionRange;
                    
                    // Only create selection if there's actually a selection
                    if (anchor.line !== head.line || anchor.ch !== head.ch) {
                        const selectionMark = editorRef.current.markText(anchor, head, {
                            className: 'remote-selection',
                            css: `background-color: ${userColor}33; border-left: 2px solid ${userColor};`
                        });

                        selectionsRef.current[socketId] = selectionMark;

                        // Clear selection after 5 seconds if no new activity
                        setTimeout(() => {
                            if (selectionsRef.current[socketId] === selectionMark) {
                                selectionMark.clear();
                                delete selectionsRef.current[socketId];
                            }
                        }, 5000);
                    }
                }

                // Auto-clear cursor after 10 seconds of inactivity
                setTimeout(() => {
                    if (cursorsRef.current[socketId] === cursorWidget) {
                        cursorWidget.clear();
                        delete cursorsRef.current[socketId];
                    }
                }, 10000);

            } catch (error) {
                console.error('Error handling cursor change:', error);
            }
        };

        socketRef.current.on(ACTIONS.CURSOR_CHANGE, handleCursorChange);

        return () => {
            socketRef.current.off(ACTIONS.CURSOR_CHANGE, handleCursorChange);
        };
    }, [socketRef.current]);

    // Clean up cursors when users disconnect
    useEffect(() => {
        if (!socketRef.current) return;

        const handleUserDisconnected = ({ socketId }) => {
            if (cursorsRef.current[socketId]) {
                cursorsRef.current[socketId].clear();
                delete cursorsRef.current[socketId];
            }
            if (selectionsRef.current[socketId]) {
                selectionsRef.current[socketId].clear();
                delete selectionsRef.current[socketId];
            }
            delete userColorsRef.current[socketId];
        };

        socketRef.current.on(ACTIONS.DISCONNECTED, handleUserDisconnected);

        return () => {
            socketRef.current.off(ACTIONS.DISCONNECTED, handleUserDisconnected);
        };
    }, [socketRef.current]);

    return (
        <div className="editor-container">
            <div className="editor-header">
                <div className="editor-tabs">
                    <div className="tab active">
                        <span>📄</span>
                        <span>main.js</span>
                    </div>
                </div>
                <div className="editor-actions">
                    <div className="active-users">
                        {clients.filter(client => client.username).map((client) => (
                            <div 
                                key={client.socketId} 
                                className="user-indicator"
                                style={{ backgroundColor: getColorForUser(client.socketId) }}
                                title={client.username}
                            >
                                {client.username.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <button className="editor-btn" title="Format Code">
                        <span>🎨</span>
                    </button>
                    <button className="editor-btn" title="Settings">
                        <span>⚙️</span>
                    </button>
                </div>
            </div>
            <textarea id="realtimeEditor" className="editor-textarea"></textarea>
        </div>
    );
};

export default Editor;
