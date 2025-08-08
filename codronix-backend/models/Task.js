const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  assigned_to: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimated_hours: {
    type: Number,
    min: 0,
    default: 0
  },
  actual_hours: {
    type: Number,
    min: 0,
    default: 0
  },
  deadline: {
    type: Date,
    required: true
  },
  reminder_date: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  started_at: {
    type: Date,
    default: null
  },
  started_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    comment: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    is_automatic: {
      type: Boolean,
      default: false
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }],
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update the updated_at field
taskSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.deadline < new Date() && this.status !== 'completed';
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

module.exports = mongoose.model('Task', taskSchema);
