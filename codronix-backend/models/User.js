const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['leader', 'member'],
    default: 'member'
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  member_id: {
    type: String,
    unique: true,
    sparse: true
  },
  tasks_assigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  joined_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);