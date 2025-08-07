const express = require('express');
const auth = require('../middleware/auth');
const UserSettings = require('../models/UserSettings');

const router = express.Router();

// Get user settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await UserSettings.findOne({ user_id: req.user._id });
    
    if (!settings) {
      // Create default settings
      settings = new UserSettings({
        user_id: req.user._id,
        notifications: {
          email: true,
          desktop: true,
          sound: true,
          taskUpdates: true,
          fileSharing: true,
          mentions: true
        },
        appearance: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY'
        },
        privacy: {
          profileVisibility: 'team',
          activityStatus: true,
          readReceipts: true
        },
        integrations: {
          googleCalendar: false,
          slack: false,
          github: false,
          trello: false
        }
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user settings
router.put('/', auth, async (req, res) => {
  try {
    const { section, settings: newSettings } = req.body;

    let userSettings = await UserSettings.findOne({ user_id: req.user._id });
    
    if (!userSettings) {
      userSettings = new UserSettings({ user_id: req.user._id });
    }

    userSettings[section] = { ...userSettings[section], ...newSettings };
    await userSettings.save();

    res.json(userSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
