const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ['GET', 'POST', 'PUT', 'DELETE'], 
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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
          activity = null; // Don't push this activity
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
const userLastActiveMap = {}; // Tracks last activity to debounce events

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
    
    // 💡 NEW: Debounce analytics update for 'joined' event
    const lastJoinTime = userLastActiveMap[finalUserId]?.join;
    const now = Date.now();
    if (!lastJoinTime || now - lastJoinTime > 60000) { // Only log join if it's been more than a minute
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

  // 💡 NEW: Listen for user navigating to a different page
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


  // Message handling
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
      
      const newMessage = new Message({
        group_id: data.group_id,
        sender_id: senderId,
        message: data.message.trim(),
        receiver_id: data.receiver_id || null,
        timestamp: new Date()
      });
      
      await newMessage.save();
      
      console.log(`💬 Message saved and broadcasting to group ${data.group_id}`);
      
      const messageToSend = {
        _id: newMessage._id,
        group_id: newMessage.group_id,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        message: newMessage.message,
        timestamp: newMessage.timestamp
      };
      
      io.to(data.group_id).emit('new-message', messageToSend);
      console.log(`✅ Message broadcasted to group ${data.group_id}`);
      
      // Update analytics for sending a message
      updateAnalytics(data.group_id, {
        user: { id: senderId },
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

  // Task updates - Triggers analytics update
  socket.on('task-update', (data) => {
    console.log(`📋 Task updated in group ${data.group_id}`);
    socket.to(data.group_id).emit('task-updated', data);
    if (data.status === 'completed' && data.completedBy) {
      updateAnalytics(data.group_id, {
        user: { id: data.completedBy },
        action: 'completed a task',
      });
    } else if (data.status === 'in_progress' && data.updatedBy) { 
      updateAnalytics(data.group_id, {
        user: { id: data.updatedBy },
        action: 'started a task',
      });
    } else if (data.updatedBy) {
      updateAnalytics(data.group_id, {
        user: { id: data.updatedBy },
        action: 'updated a task',
      });
    }
  });

  // File sharing - Triggers analytics update
  socket.on('file-shared', (data) => {
    console.log(`📁 File shared in group ${data.group_id}: ${data.file_name}`);
    
    // 💡 FIXED: Now broadcasting the full file object
    io.to(data.group_id).emit('file-shared', data.file);
    
    // 💡 FIXED: Update analytics with the correct user ID
    updateAnalytics(data.group_id, {
      user: { id: data.uploadedBy },
      action: `shared a file: ${data.file_name}`,
    });
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: http://localhost:3000`);
});