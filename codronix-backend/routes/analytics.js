const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// GET analytics data for a specific group
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Find the analytics document using the string groupId
    const analytics = await Analytics.findOne({ group_id: groupId });
    
    if (!analytics) {
      return res.status(404).json({ message: 'Analytics data not found for this group.' });
    }
    
    res.json(analytics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching analytics.' });
  }
});

module.exports = router;