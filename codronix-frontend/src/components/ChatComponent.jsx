import React, { useState, useEffect, useRef } from 'react';

const ChatComponent = ({ user, socket }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasJoinedGroup = useRef(false);

  useEffect(() => {
    console.log('ChatComponent mounted, socket:', socket);
    console.log('User:', user);

    if (socket && user) {
      // Check if socket is already connected
      if (socket.connected) {
        console.log('Socket already connected');
        setIsConnected(true);
        setSocketReady(true);
        joinGroupChat();
      }

      // Socket connection events
      const handleConnect = () => {
        console.log('✅ Socket connected in ChatComponent');
        setIsConnected(true);
        setSocketReady(true);
        hasJoinedGroup.current = false; // Reset join status
        joinGroupChat();
      };

      const handleDisconnect = (reason) => {
        console.log('❌ Socket disconnected in ChatComponent:', reason);
        setIsConnected(false);
        setSocketReady(false);
        hasJoinedGroup.current = false;
      };

      const handleNewMessage = (message) => {
        console.log('📨 New message received:', message);
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg._id === message._id);
          if (exists) {
            console.log('Message already exists, skipping');
            return prev;
          }
          console.log('Adding new message to state');
          return [...prev, message];
        });
      };

      const handleOnlineUsers = (users) => {
        console.log('👥 Online users updated:', users);
        setOnlineUsers(users);
      };

      const handleUserJoined = (data) => {
        console.log(`👋 ${data.name} joined the chat`);
      };

      const handleUserLeft = (data) => {
        console.log(`👋 ${data.name} left the chat`);
      };

      const handleUserTyping = (data) => {
        if (data.userId !== user.id) {
          setTypingUsers(prev => {
            if (data.isTyping) {
              return prev.includes(data.name) ? prev : [...prev, data.name];
            } else {
              return prev.filter(name => name !== data.name);
            }
          });
        }
      };

      const handleMessageError = (error) => {
        console.error('❌ Message error:', error);
        alert(`Failed to send message: ${error.error || 'Unknown error'}`);
      };

      // Add event listeners
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('new-message', handleNewMessage);
      socket.on('online-users', handleOnlineUsers);
      socket.on('user-joined', handleUserJoined);
      socket.on('user-left', handleUserLeft);
      socket.on('user-typing', handleUserTyping);
      socket.on('message-error', handleMessageError);

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up ChatComponent socket listeners');
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('new-message', handleNewMessage);
        socket.off('online-users', handleOnlineUsers);
        socket.off('user-joined', handleUserJoined);
        socket.off('user-left', handleUserLeft);
        socket.off('user-typing', handleUserTyping);
        socket.off('message-error', handleMessageError);
      };
    }
  }, [socket, user]);

  // Function to join group chat
  const joinGroupChat = () => {
    if (socket && user && socket.connected && !hasJoinedGroup.current) {
      console.log('🚀 Joining group chat with data:', {
        groupId: user.group_id,
        userId: user.id || user._id,
        username: user.username || user.member_id,
        name: user.name
      });

      socket.emit('join-group', {
        groupId: user.group_id,
        userId: user.id || user._id, // Handle both id and _id
        username: user.username || user.member_id,
        name: user.name
      });
      hasJoinedGroup.current = true;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      console.log('📥 Fetching messages...');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Messages fetched:', data.length);
        setMessages(data);
      } else {
        console.error('Failed to fetch messages:', response.status);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      console.log('Empty message, not sending');
      return;
    }

    if (!socket || !socketReady || !socket.connected) {
      console.log('Socket not ready, cannot send message');
      alert('Connection not ready. Please wait...');
      return;
    }

    console.log('📤 Sending message:', newMessage);
    console.log('User data for message:', {
      group_id: user.group_id,
      sender_id: user.id || user._id,
      message: newMessage.trim()
    });

    const messageData = {
      group_id: user.group_id,
      sender_id: user.id || user._id, // Handle both id and _id
      message: newMessage.trim(),
      receiver_id: null
    };

    // Clear input immediately for better UX
    const messageToSend = newMessage;
    setNewMessage('');
    
    // Stop typing indicator
    if (socket && socketReady) {
      socket.emit('typing-stop', {
        group_id: user.group_id,
        userId: user.id || user._id,
        name: user.name
      });
    }

    try {
      // Send message via socket
      socket.emit('send-message', messageData);
      console.log('✅ Message sent via socket');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Restore message if failed
      setNewMessage(messageToSend);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && socketReady && socket.connected && e.target.value.trim()) {
      // Start typing indicator
      socket.emit('typing-start', {
        group_id: user.group_id,
        userId: user.id || user._id,
        name: user.name
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', {
          group_id: user.group_id,
          userId: user.id || user._id,
          name: user.name
        });
      }, 2000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="chat-component">
        <div className="loading">Loading chat...</div>
      </div>
    );
  }

  // Show socket not ready state
  if (!socket) {
    return (
      <div className="chat-component">
        <div className="loading">Connecting to chat...</div>
      </div>
    );
  }

  return (
    <div className="chat-component">
      <div className="chat-header">
        <h2>Group Chat</h2>
        <div className="connection-status">
          <span className={`status-indicator ${socketReady && socket.connected ? 'connected' : 'disconnected'}`}>
            {socketReady && socket.connected ? '🟢 Connected' : '🔴 Connecting...'}
          </span>
          <span className="online-count">
            {onlineUsers.length} online
          </span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message._id}
              className={`message ${(message.sender_id._id === user.id || message.sender_id._id === user._id) ? 'own-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="sender-name">
                  {message.sender_id.name}
                  {message.sender_id.role === 'leader' && (
                    <span className="leader-badge">Leader</span>
                  )}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="message-content">
                {message.message}
              </div>
            </div>
          ))
        )}
        
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder={socketReady && socket.connected ? "Type your message..." : "Connecting..."}
          className="message-input"
          disabled={!socketReady || !socket.connected}
        />
        <button 
          type="submit" 
          className="send-btn"
          disabled={!socketReady || !socket.connected || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatComponent;
