const mongoose = require('mongoose');

const UserSettingsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  notifications: {
    email: { type: Boolean, default: true },
    desktop: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    taskUpdates: { type: Boolean, default: true },
    fileSharing: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true }
  },
  appearance: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['team', 'organization', 'public'], default: 'team' },
    activityStatus: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true }
  },
  integrations: {
    googleCalendar: { type: Boolean, default: false },
    slack: { type: Boolean, default: false },
    github: { type: Boolean, default: false },
    trello: { type: Boolean, default: false }
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserSettings', UserSettingsSchema);
