const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const CalendarEvent = require('../models/CalendarEvent');
const User = require('../models/User'); 

// Get all calendar events for the user's group
router.get('/events', authMiddleware, async (req, res) => {
  try {
    const user = req.user; 
    
    if (!user || !user.group_id) {
      return res.json([]);
    }
    
    // CHANGE: Removed .populate('group_id') as it's no longer an ObjectId reference.
    const events = await CalendarEvent.find({ group_id: user.group_id }).populate('created_by', 'name');
    res.json(events);
  } catch (err) {
    console.error('Error fetching calendar events:', err.message);
    res.status(500).send('Server error');
  }
});

// Create a new calendar event
router.post('/events', authMiddleware, async (req, res) => {
  const { title, description, date, time, type, attendees } = req.body;
  
  try {
    const user = req.user;
    if (!user || user.role !== 'leader') {
      return res.status(403).json({ msg: 'Only group leaders can create events' });
    }
    
    if (!user.group_id) {
      return res.status(400).json({ msg: 'User is not part of a group.' });
    }

    const newEvent = new CalendarEvent({
      title,
      description,
      date,
      time,
      type,
      group_id: user.group_id,
      created_by: user._id, 
      attendees,
    });
    
    const event = await newEvent.save();
    
    await event.populate('created_by', 'name');
    
    res.json(event);
  } catch (err) {
    console.error('Error creating calendar event:', err.message);
    res.status(500).send('Server error');
  }
});

// A new route to handle task creation - Assuming this is what you meant by "add task"
router.post('/tasks', authMiddleware, async (req, res) => {
  const { title, description, dueDate, assignedTo } = req.body;
  
  try {
    const user = req.user;
    if (!user || user.role !== 'leader') {
      return res.status(403).json({ msg: 'Only group leaders can create tasks' });
    }
    
    // Assuming you have a Task model
    const Task = require('../models/Task');
    
    const newTask = new Task({
      title,
      description,
      dueDate,
      assignedTo,
      group_id: user.group_id,
      createdBy: user._id
    });
    
    const task = await newTask.save();
    res.json(task);
    
  } catch (err) {
    console.error('Error creating new task:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;