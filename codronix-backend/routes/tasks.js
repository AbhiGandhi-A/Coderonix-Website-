const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/tasks/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Create task with enhanced features
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    console.log('Creating task with data:', req.body);
    console.log('User:', req.user);
    console.log('Files:', req.files);

    const { 
      title, 
      description, 
      assigned_to, 
      deadline, 
      priority, 
      category,
      tags,
      estimated_hours,
      reminder_date
    } = req.body;

    // Validate required fields
    if (!title || !description || !assigned_to || !deadline) {
      console.log('Missing required fields:', { title, description, assigned_to, deadline });
      return res.status(400).json({ 
        message: 'Missing required fields: title, description, assigned_to, deadline' 
      });
    }

    // Parse assigned_to if it's a string
    let assignedToArray;
    try {
      assignedToArray = typeof assigned_to === 'string' ? JSON.parse(assigned_to) : assigned_to;
      if (!Array.isArray(assignedToArray)) {
        assignedToArray = [assignedToArray];
      }
    } catch (error) {
      console.log('Error parsing assigned_to:', error);
      return res.status(400).json({ message: 'Invalid assigned_to format' });
    }

    // Validate assigned users exist and belong to the same group
    const assignedUsers = await User.find({
      _id: { $in: assignedToArray },
      group_id: req.user.group_id
    });

    if (assignedUsers.length !== assignedToArray.length) {
      console.log('Some assigned users not found or not in group');
      return res.status(400).json({ 
        message: 'Some assigned users do not exist or do not belong to your group' 
      });
    }

    // Parse tags if provided
    let tagsArray = [];
    if (tags) {
      try {
        tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (!Array.isArray(tagsArray)) {
          tagsArray = [];
        }
      } catch (error) {
        console.log('Error parsing tags:', error);
        tagsArray = [];
      }
    }

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          uploadedBy: req.user._id
        });
      });
    }

    // Create the task
    const task = new Task({
      group_id: req.user.group_id,
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedToArray,
      deadline: new Date(deadline),
      priority: priority || 'medium',
      category: category || 'other',
      tags: tagsArray,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : 0,
      reminder_date: reminder_date ? new Date(reminder_date) : null,
      created_by: req.user._id,
      attachments: attachments
    });

    await task.save();
    console.log('Task saved successfully:', task._id);

    // Populate references for response
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');

    // Add automatic comment
    task.comments.push({
      comment: `Task created and assigned to ${assignedUsers.map(u => u.name).join(', ')}`,
      author: req.user._id,
      is_automatic: true
    });

    await task.save();
    console.log('Task created successfully with ID:', task._id);
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    
    // Clean up uploaded files if task creation failed
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
    }
    
    res.status(500).json({ 
      message: 'Server error while creating task', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get tasks for group with filtering and sorting
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.user._id, 'group:', req.user.group_id);
    
    const { 
      status, 
      priority, 
      category, 
      assigned_to, 
      sort_by = 'created_at', 
      sort_order = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = { group_id: req.user.group_id };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assigned_to) filter.assigned_to = assigned_to;

    console.log('Filter:', filter);

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;

    const tasks = await Task.find(filter)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .populate('completedBy', 'name')
      .populate('started_by', 'name')
      .populate('comments.author', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    console.log('Found tasks:', tasks.length);

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalTasks / parseInt(limit)),
        total_tasks: totalTasks,
        has_next: skip + tasks.length < totalTasks,
        has_prev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching tasks', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get task statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { group_id: req.user.group_id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          high_priority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          urgent_priority: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          overdue: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $lt: ['$deadline', new Date()] },
                    { $ne: ['$status', 'completed'] }
                  ]
                }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      high_priority: 0,
      urgent_priority: 0,
      overdue: 0
    };

    res.json(result);
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task status
router.put('/:taskId/status', auth, async (req, res) => {
  try {
    const { status, started_at, started_by, completed_at, completed_by } = req.body;
    const userId = req.user._id;
    
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is assigned to this task or is the creator
    const isAssigned = task.assigned_to.some(id => id.toString() === userId.toString());
    const isCreator = task.created_by.toString() === userId.toString();
    const isLeader = req.user.role === 'leader';
    
    if (!isAssigned && !isCreator && !isLeader) {
      return res.status(403).json({ message: 'You are not authorized to update this task.' });
    }

    const oldStatus = task.status;
    task.status = status;
    
    // Add status change comment
    let commentText = `Status changed from ${oldStatus} to ${status}`;
    
    if (status === 'in_progress') {
      task.started_at = started_at || new Date();
      task.started_by = started_by || userId;
      commentText = 'Started working on this task';
    } else if (status === 'completed') {
      task.completedBy = completed_by || userId;
      task.completed_at = completed_at || new Date();
      task.progress = 100;
      commentText = 'Completed this task';
    } else if (status === 'pending') {
      // Reset progress when back to pending
      task.progress = 0;
      task.started_at = null;
      task.started_by = null;
      task.completedBy = null;
      task.completed_at = null;
      commentText = 'Reset task to pending';
    }

    // Add comment
    task.comments.push({
      comment: commentText,
      author: userId,
      is_automatic: true
    });

    await task.save();
    
    // Populate all references for the response
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');
    await task.populate('completedBy', 'name');
    await task.populate('started_by', 'name');
    await task.populate('comments.author', 'name');

    res.json(task);
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task progress
router.put('/:taskId/progress', auth, async (req, res) => {
  try {
    const { progress } = req.body;
    const userId = req.user._id;
    
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    const isAssigned = task.assigned_to.some(id => id.toString() === userId.toString());
    const isCreator = task.created_by.toString() === userId.toString();
    const isLeader = req.user.role === 'leader';
    
    if (!isAssigned && !isCreator && !isLeader) {
      return res.status(403).json({ message: 'You are not authorized to update this task.' });
    }

    const oldProgress = task.progress;
    task.progress = Math.min(100, Math.max(0, progress));
    
    // Auto-complete if progress reaches 100%
    if (task.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedBy = userId;
      task.completed_at = new Date();
    }

    // Add progress comment for significant changes
    if (Math.abs(task.progress - oldProgress) >= 10) {
      task.comments.push({
        comment: `Progress updated from ${oldProgress}% to ${task.progress}%`,
        author: userId,
        is_automatic: true
      });
    }

    await task.save();
    
    // Populate all references for the response
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');
    await task.populate('completedBy', 'name');
    await task.populate('started_by', 'name');
    await task.populate('comments.author', 'name');

    res.json(task);
  } catch (error) {
    console.error('Update task progress error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add task comment
router.post('/:taskId/comments', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const taskId = req.params.taskId;
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization
    const isAssigned = task.assigned_to.some(id => id.toString() === req.user._id.toString());
    const isCreator = task.created_by.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';
    
    if (!isAssigned && !isCreator && !isLeader) {
      return res.status(403).json({ message: 'You are not authorized to comment on this task.' });
    }

    task.comments.push({
      comment: comment.trim(),
      author: req.user._id,
      is_automatic: false
    });

    await task.save();
    await task.populate('comments.author', 'name');

    // Return the new comment
    const newComment = task.comments[task.comments.length - 1];
    res.json(newComment);
  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get task comments
router.get('/:taskId/comments', auth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    
    const task = await Task.findById(taskId)
      .populate('comments.author', 'name')
      .select('comments');
      
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task.comments);
  } catch (error) {
    console.error('Get task comments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update entire task
router.put('/:taskId', auth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const updates = req.body;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization (only creator or leader can update)
    const isCreator = task.created_by.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';
    
    if (!isCreator && !isLeader) {
      return res.status(403).json({ message: 'You are not authorized to update this task.' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'assigned_to', 'deadline', 'priority', 
      'category', 'tags', 'estimated_hours', 'reminder_date'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        task[field] = updates[field];
      }
    });

    // Add update comment
    task.comments.push({
      comment: 'Task details updated',
      author: req.user._id,
      is_automatic: true
    });

    await task.save();
    
    // Populate all references for the response
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');
    await task.populate('completedBy', 'name');
    await task.populate('started_by', 'name');
    await task.populate('comments.author', 'name');

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/:taskId', auth, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check authorization (only creator or leader can delete)
    const isCreator = task.created_by.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';
    
    if (!isCreator && !isLeader) {
      return res.status(403).json({ message: 'You are not authorized to delete this task.' });
    }

    await Task.findByIdAndDelete(taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's assigned tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const { status, priority, sort_by = 'deadline', sort_order = 'asc' } = req.query;
    
    // Build filter
    const filter = { assigned_to: req.user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Build sort object
    const sortObj = {};
    sortObj[sort_by] = sort_order === 'asc' ? 1 : -1;

    const tasks = await Task.find(filter)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .populate('completedBy', 'name')
      .populate('started_by', 'name')
      .populate('comments.author', 'name')
      .sort(sortObj);

    res.json(tasks);
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single task by ID
router.get('/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .populate('completedBy', 'name')
      .populate('started_by', 'name')
      .populate('comments.author', 'name')
      .populate('attachments.uploadedBy', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    const isAssigned = task.assigned_to.some(user => user._id.toString() === req.user._id.toString());
    const isCreator = task.created_by._id.toString() === req.user._id.toString();
    const isLeader = req.user.role === 'leader';
    const isSameGroup = task.group_id === req.user.group_id;

    if (!isSameGroup || (!isAssigned && !isCreator && !isLeader)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
