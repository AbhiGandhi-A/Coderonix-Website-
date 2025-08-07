// models/Analytics.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnalyticsSchema = new Schema({
  group_id: {
    type: String,
    required: true,
    unique: true,
  },
  taskStatusCounts: {
    type: Object,
    default: {},
  },
  fileTypeCounts: {
    type: Object,
    default: {},
  },
  // 💡 NEW FIELD: To store the count of tasks completed by each user.
  tasksCompletedByUser: { 
    type: Object,
    default: {},
  },
  // This field is no longer being used on the front end but is kept for data integrity.
  recentActivities: [
    {
      user: {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
      action: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);