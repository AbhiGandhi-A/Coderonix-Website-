// routes/tasks.js
const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, assigned_to, deadline } = req.body;

    const task = new Task({
      group_id: req.user.group_id,
      title,
      description,
      assigned_to,
      deadline,
      created_by: req.user._id
    });

    await task.save();
    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');

    res.status(201).json(task);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks for group
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ 
      group_id: req.user.group_id 
    })
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name')
    .sort({ created_at: -1 });

    res.json(tasks);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.put('/:taskId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 💡 NEW LOGIC: Only allow assigned users to update status
    const isAssigned = task.assigned_to.some(id => id.toString() === userId.toString());
    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not authorized to update this task.' });
    }

    // 💡 NEW LOGIC: If status is 'completed', set the completedBy field
    if (status === 'completed') {
      task.completedBy = userId;
    } else {
      // If status is changed from 'completed', clear the completedBy field
      task.completedBy = null;
    }

    task.status = status;
    task.updated_at = Date.now();
    await task.save();

    await task.populate('assigned_to', 'name email');
    await task.populate('created_by', 'name');

    res.json(task);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's assigned tasks
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ 
      assigned_to: req.user._id 
    })
    .populate('assigned_to', 'name email')
    .populate('created_by', 'name')
    .sort({ deadline: 1 });

    res.json(tasks);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;