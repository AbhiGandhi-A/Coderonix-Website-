const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get group members - Updated to work with both ObjectId and string group_id
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // First try to find by ObjectId (if it's a valid ObjectId)
    let group = null;
    let users = [];
    
    // Check if groupId looks like an ObjectId
    if (groupId.match(/^[0-9a-fA-F]{24}$/)) {
      // Try to find group by ObjectId
      group = await Group.findOne({
        _id: groupId
      }).populate('members', '-password').populate('leader_id', '-password');
      
      if (group) {
        // Verify user belongs to this group
        const userInGroup = group.members.some(member => member._id.toString() === req.user.id) || 
                           (group.leader_id && group.leader_id._id.toString() === req.user.id);
        
        if (!userInGroup) {
          return res.status(403).json({ message: 'Access denied: You do not belong to this group' });
        }
        
        // Return all members including leader
        const allMembers = [...group.members];
        if (group.leader_id && !group.members.some(m => m._id.toString() === group.leader_id._id.toString())) {
          allMembers.push(group.leader_id);
        }
        
        return res.json(allMembers);
      }
    }
    
    // If not found by ObjectId or not a valid ObjectId, try by group_id string
    users = await User.find({ 
      group_id: groupId 
    }).select('_id name email role');
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Group not found or no members' });
    }
    
    // Verify requesting user belongs to this group
    const requestingUser = users.find(user => user._id.toString() === req.user.id);
    if (!requestingUser) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this group' });
    }
    
    res.json(users);
    
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group by group_id string
router.get('/by-id/:groupId', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      group_id: req.params.groupId 
    }).select('-password');
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Verify requesting user belongs to this group
    const requestingUser = users.find(user => user._id.toString() === req.user.id);
    if (!requestingUser) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this group' });
    }
    
    const leader = users.find(user => user.role === 'leader');
    const members = users.filter(user => user.role === 'member');
    
    res.json({
      group_id: req.params.groupId,
      leader,
      members,
      all_members: users
    });
  } catch (error) {
    console.error('Get group by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get group details by ObjectId (original functionality)
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.groupId
    }).populate('members', '-password').populate('leader_id', '-password');
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Verify user belongs to this group
    const userInGroup = group.members.some(member => member._id.toString() === req.user.id) || 
                       (group.leader_id && group.leader_id._id.toString() === req.user.id);
    
    if (!userInGroup) {
      return res.status(403).json({ message: 'Access denied: You do not belong to this group' });
    }
    
    res.json({
      leader: group.leader_id,
      members: group.members,
      group: group
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
