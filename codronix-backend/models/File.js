const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true
  },
  file_name: {
    type: String,
    required: true
  },
  file_path: {
    type: String,
    required: true
  },
  shared_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shared_with: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', fileSchema);