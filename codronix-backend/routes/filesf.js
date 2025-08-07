// routes/files.js
const express = require('express');
const multer = require('multer');
const File = require('../models/File');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Upload a new file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { folder_id } = req.body;
    const newFile = new File({
      filename: req.file.originalname,
      file_type: req.file.mimetype,
      path: req.file.path,
      uploaded_by: req.user._id,
      group_id: req.user.group_id,
      folder_id: folder_id || null, // Associate with a folder if provided
    });
    await newFile.save();
    res.status(201).json(newFile);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all files (now with optional folderId)
router.get('/', auth, async (req, res) => {
  try {
    const { folderId } = req.query;
    const files = await File.find({ 
      group_id: req.user.group_id,
      folder_id: folderId || null
    }).populate('uploaded_by', 'name');
    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;