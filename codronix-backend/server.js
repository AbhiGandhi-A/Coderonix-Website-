const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const multer = require('multer');

const ACTIONS = require('./Actions');

// Import all Mongoose models
const Message = require('./models/Message');
const Task = require('./models/Task');
const Analytics = require('./models/Analytics'); 
const File = require('./models/File');
const User = require('./models/User'); 
const Folder = require('./models/Folder');

// Import all REST API routes
const authRoutes = require('./routes/auth');
const groupsRoutes = require('./routes/groups');
const tasksRoutes = require('./routes/tasks');
const messagesRoutes = require('./routes/messages');
const filesRoutes = require('./routes/files');
const calendarRoutes = require('./routes/calendar');
const analyticsRoutes = require('./routes/analytics');
const foldersRoutes = require('./routes/folders');
const docsRoutes = require('./routes/docs');

const app = express();
const server = http.createServer(app);

const SERVER_IP = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';// Remove http:// prefix
const PORT = process.env.PORT || 5000;

const clientOrigins = [
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    `http://${SERVER_IP}:3000`,
    "https://coderonix-website-nc7p-6nbfbxjg1.vercel.app"
];

const io = new Server(server, {
    cors: {
        origin: clientOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
    origin: clientOrigins,
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send('Coderonix API is live!');
});


// Add this after the existing middleware but before the routes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/docs', docsRoutes);

// Helper function to update and broadcast analytics
const updateAnalytics = async (groupId, activity) => {
    try {
        const taskStatusCounts = await Task.aggregate([
          { $match: { group_id: groupId } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const fileTypeCounts = await File.aggregate([
          { $match: { group_id: groupId } },
          { $group: { _id: '$file_type', count: { $sum: 1 } } },
        ]);

        const tasksCompletedCounts = await Task.aggregate([
          { $match: { group_id: groupId, status: 'completed' } },
          {
            $lookup: {
              from: 'users',
              localField: 'completedBy',
              foreignField: '_id',
              as: 'completedByUser'
            }
          },
          { $unwind: '$completedByUser' },
          { $group: { _id: '$completedByUser.name', count: { $sum: 1 } } },
        ]);

        const taskStatusObj = {};
        taskStatusCounts.forEach(item => { taskStatusObj[item._id] = item.count; });

        const fileTypeObj = {};
        fileTypeCounts.forEach(item => { fileTypeObj[item._id] = item.count; });

        const tasksCompletedObj = {};
        tasksCompletedCounts.forEach(item => { tasksCompletedObj[item._id] = item.count; });

        const updateQuery = {
          taskStatusCounts: taskStatusObj,
          fileTypeCounts: fileTypeObj,
          tasksCompletedByUser: tasksCompletedObj,
          lastUpdated: new Date(),
        };

        if (activity) {
          // Fetch user name if not provided
          if (activity.user && activity.user.id && !activity.user.name) {
            const userDoc = await User.findById(activity.user.id);
            if (userDoc) {
              activity.user.name = userDoc.name;
            } else {
              activity.user.name = `User ID: ${activity.user.id}`;
            }
          }
          
          // Check for and suppress redundant 'joined the group' activities
          if (activity.action === 'joined the group') {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const hasJoinedRecently = await Analytics.findOne({ 
              group_id: groupId,
              'recentActivities.user.id': activity.user.id,
              'recentActivities.action': 'joined the group',
              'recentActivities.timestamp': { $gte: oneHourAgo }
            });
            
            if (hasJoinedRecently) {
              console.log(`ℹ️ Suppressing redundant 'joined the group' activity for user ${activity.user.name}`);
              activity = null;
            }
          }

          if (activity) {
            updateQuery.$push = {
              recentActivities: {
                $each: [activity],
                $sort: { timestamp: -1 },
                $slice: 10,
              },
            };
          }
        }

        const analytics = await Analytics.findOneAndUpdate(
          { group_id: groupId },
          updateQuery,
          { new: true, upsert: true }
        );
        
        io.to(groupId).emit('analytics-update', analytics);
        console.log(`📈 Analytics updated and broadcasted for group ${groupId}`);
        
    } catch (error) {
        console.error('❌ Error updating analytics:', error);
    }
};

// Socket.IO Logic
const userSocketMap = {};
const groupRooms = {};
const userLastActiveMap = {};

function getAllConnectedClients(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room).map(socketId => ({
        socketId,
        username: userSocketMap[socketId]?.username,
        userId: userSocketMap[socketId]?.userId,
        name: userSocketMap[socketId]?.name
    })).filter(client => client.username);
}

function removeUserFromGroup(socketId) {
    const userData = userSocketMap[socketId];
    if (userData && userData.groupId) {
        const groupId = userData.groupId;
        if (groupRooms[groupId]) {
            groupRooms[groupId].delete(socketId);
            if (groupRooms[groupId].size === 0) {
                delete groupRooms[groupId];
            }
        }
    }
    delete userSocketMap[socketId];
}

function addUserToGroup(socket, groupId, userData) {
    if (!groupRooms[groupId]) {
        groupRooms[groupId] = new Set();
    }
    groupRooms[groupId].add(socket.id);
    userSocketMap[socket.id] = { ...userData, groupId };
    console.log(`👤 Added user ${userData.name || userData.username} to group ${groupId}`);
}

io.on('connection', (socket) => {
    console.log('🔌 New socket connected:', socket.id);

    // Code editor join
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = { username, roomId, type: 'code-editor' };
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
        console.log(`💻 ${username} joined code editor room ${roomId}`);
    });

    // Code change
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Cursor change
    socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, cursor, selection, socketId }) => {
        const userData = userSocketMap[socket.id];
        if (userData) {
            socket.to(roomId).emit(ACTIONS.CURSOR_CHANGE, {
                cursor,
                selection,
                socketId: socket.id,
                username: userData.username
            });
        }
    });

    // Sync code with new user
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Group chat join
    socket.on('join-group', (data) => {
        console.log('📥 Join group request:', data);
        const { groupId, userId, username, name } = data;
        
        if (!groupId || !name) {
            console.error('❌ Invalid join-group data - missing groupId or name:', data);
            socket.emit('join-error', { error: 'Missing required fields: groupId and name' });
            return;
        }

        const finalUserId = userId || new mongoose.Types.ObjectId();
        
        socket.join(groupId);
        addUserToGroup(socket, groupId, { 
            userId: finalUserId, 
            username: username || name, 
            name,
            type: 'chat'
        });
        
        console.log(`📥 ${name} (${socket.id}) joined group ${groupId}`);
        
        socket.to(groupId).emit('user-joined', {
            userId: finalUserId,
            username: username || name,
            name,
            message: `${name} joined the chat`
        });
        
        const onlineUsers = getAllConnectedClients(groupId);
        socket.emit('online-users', onlineUsers);
        io.to(groupId).emit('online-users', onlineUsers);
        
        const lastJoinTime = userLastActiveMap[finalUserId]?.join;
        const now = Date.now();
        if (!lastJoinTime || now - lastJoinTime > 60000) {
            updateAnalytics(groupId, {
                user: { id: finalUserId, name: name },
                action: 'joined the group',
            });
            if (!userLastActiveMap[finalUserId]) {
                userLastActiveMap[finalUserId] = {};
            }
            userLastActiveMap[finalUserId].join = now;
        }
    });

    // Listen for user navigating to a different page
    socket.on('user-on-page', (data) => {
        const { groupId, userId, pageName } = data;
        const userData = userSocketMap[socket.id];
        if (userData && userData.userId === userId && userData.groupId === groupId) {
            console.log(`🚶 User ${userData.name} is on page: ${pageName}`);
            updateAnalytics(groupId, {
                user: { id: userId },
                action: `viewed the ${pageName} page`,
            });
        }
    });

    // Message handling - IMPROVED
    socket.on('send-message', async (data) => {
        console.log('📤 Received message:', data);
        
        try {
            if (!data.group_id || !data.message || !data.message.trim()) {
                console.error('❌ Invalid message data - missing required fields:', data);
                socket.emit('message-error', { 
                    error: 'Missing required fields: group_id and message',
                    originalMessage: data
                });
                return;
            }

            let senderId = data.sender_id;
            if (!senderId) {
                const userData = userSocketMap[socket.id];
                senderId = userData?.userId;
            }

            if (!senderId) {
                console.error('❌ Cannot determine sender_id:', data);
                socket.emit('message-error', { 
                    error: 'Cannot determine sender ID',
                    originalMessage: data
                });
                return;
            }
            
            // Create and save the message
            const newMessage = new Message({
                group_id: data.group_id,
                sender_id: senderId,
                message: data.message.trim(),
                receiver_id: data.receiver_id || null,
                timestamp: new Date()
            });
            
            await newMessage.save();
            
            // Populate the sender information for broadcasting
            await newMessage.populate('sender_id', 'name role');
            
            console.log(`💬 Message saved and broadcasting to group ${data.group_id}`);
            
            // Create message object with populated sender info
            const messageToSend = {
                _id: newMessage._id,
                group_id: newMessage.group_id,
                sender_id: {
                    _id: newMessage.sender_id._id,
                    name: newMessage.sender_id.name,
                    role: newMessage.sender_id.role
                },
                receiver_id: newMessage.receiver_id,
                message: newMessage.message,
                timestamp: newMessage.timestamp
            };
            
            // Broadcast to all users in the group
            io.to(data.group_id).emit('new-message', messageToSend);
            console.log(`✅ Message broadcasted to group ${data.group_id}`);
            
            // Update analytics
            updateAnalytics(data.group_id, {
                user: { id: senderId, name: newMessage.sender_id.name },
                action: 'sent a message',
            });

        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('message-error', { 
                error: 'Failed to send message',
                originalMessage: data,
                details: error.message
            });
        }
    });

    // Task updates - Enhanced with proper notification broadcasting
    socket.on('task-update', (data) => {
        console.log(`📋 Task updated in group ${data.group_id}:`, data);
        
        // Validate required data
        if (!data.group_id || !data.task || !data.user) {
            console.error('❌ Invalid task-update data:', data);
            return;
        }
        
        // Broadcast task update to all users in the group except sender
        socket.to(data.group_id).emit('task-updated', {
            group_id: data.group_id,
            task: data.task,
            action: data.action,
            user: data.user
        });
        
        // Determine notification type and create notification
        let notificationType = 'task';
        let notificationData = {
            task: {
                _id: data.task._id,
                title: data.task.title || 'Unknown Task',
                status: data.task.status,
                priority: data.task.priority,
                progress: data.task.progress
            },
            user: {
                _id: data.user._id,
                name: data.user.name || 'Unknown User'
            }
        };
        
        // Set specific notification type based on action
        if (data.action === 'completed') {
            notificationType = 'task-completed';
        } else if (data.action === 'started' || data.action === 'in_progress') {
            notificationType = 'task-started';
        } else if (data.action === 'created') {
            notificationType = 'task';
        }
        
        // Create and broadcast notification
        const notification = {
            id: Date.now() + Math.random(), // Ensure unique ID
            type: notificationType,
            data: notificationData,
            timestamp: new Date(),
            group_id: data.group_id
        };
        
        console.log(`📢 Broadcasting notification to group ${data.group_id}:`, notification);
        
        // Broadcast notification to all users in the group except sender
        socket.to(data.group_id).emit('notification', notification);
        
        // Update analytics based on action
        if (data.action === 'completed' && data.task.completedBy) {
            updateAnalytics(data.group_id, {
                user: { id: data.task.completedBy, name: data.user.name },
                action: 'completed a task',
                timestamp: new Date()
            });
        } else if (data.action === 'started' || data.action === 'in_progress') {
            updateAnalytics(data.group_id, {
                user: { id: data.user._id, name: data.user.name },
                action: 'started a task',
                timestamp: new Date()
            });
        } else if (data.action === 'created') {
            updateAnalytics(data.group_id, {
                user: { id: data.user._id, name: data.user.name },
                action: 'created a task',
                timestamp: new Date()
            });
        }
    });

    // Task progress updates - Enhanced with notifications
    socket.on('task-progress-update', (data) => {
        console.log(`📈 Task progress updated in group ${data.group_id}:`, data);
        
        // Validate required data
        if (!data.group_id || !data.task || !data.user) {
            console.error('❌ Invalid task-progress-update data:', data);
            return;
        }
        
        // Broadcast progress update to all users in the group except sender
        socket.to(data.group_id).emit('task-progress-updated', {
            group_id: data.group_id,
            task: data.task,
            user: data.user
        });
        
        // Send notification for significant progress updates (every 25%)
        const progress = data.task.progress || 0;
        if (progress > 0 && progress % 25 === 0) {
            const notification = {
                id: Date.now() + Math.random(),
                type: 'task-progress',
                data: {
                    task: {
                        _id: data.task._id,
                        title: data.task.title || 'Unknown Task',
                        progress: progress,
                        status: data.task.status
                    },
                    user: {
                        _id: data.user._id,
                        name: data.user.name || 'Unknown User'
                    }
                },
                timestamp: new Date(),
                group_id: data.group_id
            };
            
            console.log(`📢 Broadcasting progress notification to group ${data.group_id}:`, notification);
            socket.to(data.group_id).emit('notification', notification);
        }
    });

    // File sharing - Triggers analytics update
    socket.on('file-shared', (data) => {
        console.log(`📁 File shared in group ${data.group_id}`);
        io.to(data.group_id).emit('file-shared', data);
        
        // Create and broadcast file notification
        const notification = {
            id: Date.now() + Math.random(),
            type: 'file',
            data: {
                user: {
                    _id: data.uploadedBy,
                    name: data.userName || 'Unknown User'
                },
                fileName: data.fileName || 'Unknown File'
            },
            timestamp: new Date(),
            group_id: data.group_id
        };
        
        socket.to(data.group_id).emit('notification', notification);
        
        updateAnalytics(data.group_id, {
            user: { id: data.uploadedBy },
            action: 'shared a file',
            timestamp: new Date()
        });
    });

    // Document sharing notifications
    socket.on('document-shared', (data) => {
        console.log(`📄 Document shared in group ${data.group_id}`);
        
        const notification = {
            id: Date.now() + Math.random(),
            type: 'file',
            data: {
                user: {
                    _id: data.shared_by._id,
                    name: data.shared_by.name || 'Unknown User'
                },
                fileName: data.document_title || 'Document'
            },
            timestamp: new Date(),
            group_id: data.group_id
        };
        
        io.to(data.group_id).emit('notification', notification);
        io.to(data.group_id).emit('document-shared', data);
    });

    // Document updates
    socket.on('document-updated', (data) => {
        console.log(`📝 Document updated in group ${data.group_id}`);
        io.to(data.group_id).emit('document-updated', data);
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
        socket.to(data.group_id).emit('user-typing', {
            userId: data.userId,
            name: data.name,
            isTyping: true
        });
    });

    socket.on('typing-stop', (data) => {
        socket.to(data.group_id).emit('user-typing', {
            userId: data.userId,
            name: data.name,
            isTyping: false
        });
    });
    
    // Calendar event updates - Triggers analytics update
    socket.on('event-created', (data) => {
        console.log(`📅 New event created in group ${data.group_id}`);
        io.to(data.group_id).emit('event-created', data);
        updateAnalytics(data.group_id, {
            user: { id: data.createdBy },
            action: 'created a calendar event',
            timestamp: new Date()
        });
    });

    // Enhanced disconnect handling
    socket.on('disconnecting', () => {
        console.log('🔌 Socket disconnecting:', socket.id);
        const userData = userSocketMap[socket.id];
        
        if (userData) {
            if (userData.type === 'chat' && userData.groupId) {
                socket.to(userData.groupId).emit('user-left', {
                    userId: userData.userId,
                    name: userData.name,
                    message: `${userData.name} left the chat`
                });
                
                setTimeout(() => {
                    const onlineUsers = getAllConnectedClients(userData.groupId);
                    io.to(userData.groupId).emit('online-users', onlineUsers);
                }, 100);
            }
            
            const rooms = [...socket.rooms];
            rooms.forEach((roomId) => {
                if (roomId !== socket.id) {
                    socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                        socketId: socket.id,
                        username: userData.username,
                    });
                }
            });
            
            removeUserFromGroup(socket.id);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });
});

// Add error handling middleware at the end, before the server.listen
app.use((error, req, res, next) => {
  console.error('Express error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  }
  
  if (error.message === 'Invalid file type') {
    return res.status(400).json({ message: 'Invalid file type. Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, txt, zip, rar' });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Add 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Accessible on network at: http://${SERVER_IP}:${PORT}`);
    console.log(`🌐 CORS enabled for: ${clientOrigins.join(', ')}`);
});
