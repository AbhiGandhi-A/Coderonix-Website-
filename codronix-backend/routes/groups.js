const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get group members
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ 
      _id: req.params.groupId 
    }).populate('members', '-password').populate('leader_id', '-password');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({
      leader: group.leader_id,
      members: group.members
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group by group_id string
router.get('/by-id/:groupId', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      group_id: req.params.groupId 
    }).select('-password');

    const leader = users.find(user => user.role === 'leader');
    const members = users.filter(user => user.role === 'member');

    res.json({
      group_id: req.params.groupId,
      leader,
      members
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;