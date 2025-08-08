// routes/calendarRoutes.js

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
        
        const events = await CalendarEvent.find({ group_id: user.group_id })
            .populate('created_by', 'name')
            .populate('attendees', 'name'); 
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
        await event.populate('attendees', 'name'); 
        
        res.json(event);
    } catch (err) {
        console.error('Error creating calendar event:', err.message);
        res.status(500).send('Server error');
    }
});

// 💡 NEW ROUTE: Join an event
router.post('/events/:eventId/join', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const eventId = req.params.eventId;

        const event = await CalendarEvent.findById(eventId);
        if (!event) {
            return res.status(404).json({ msg: 'Event not found.' });
        }
        
        // Ensure the user is not already an attendee and add them
        if (!event.attendees.includes(user._id)) {
            event.attendees.push(user._id);
            await event.save();
        }

        // Populate and return the updated event
        await event.populate('created_by', 'name');
        await event.populate('attendees', 'name');

        res.json(event);
    } catch (err) {
        console.error('Error joining event:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;