// models/File.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
  group_id: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  file_type: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  uploaded_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  folder_id: { // 💡 NEW FIELD: Links a file to a folder
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', fileSchema);