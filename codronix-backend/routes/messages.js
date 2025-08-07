const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Get messages for group
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;
    const messages = await Message.find({ group_id: user.group_id })
      .populate('sender_id', 'name role')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/', auth, async (req, res) => {
  try {
    const { message, receiver_id } = req.body;

    const newMessage = new Message({
      group_id: req.user.group_id,
      sender_id: req.user._id,
      receiver_id: receiver_id || null,
      message
    });

    await newMessage.save();
    await newMessage.populate('sender_id', 'name role');
    
    if (receiver_id) {
      await newMessage.populate('receiver_id', 'name');
    }

    res.status(201).json(newMessage);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;