const express = require('express');
const multer = require('multer');
const path = require('path');
const File = require('../models/File');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { shared_with } = req.body;
    let sharedWithArray = [];
    
    if (shared_with) {
      sharedWithArray = JSON.parse(shared_with);
    }

    const file = new File({
      group_id: req.user.group_id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      shared_by: req.user._id,
      shared_with: sharedWithArray
    });

    await file.save();
    await file.populate('shared_by', 'name');
    await file.populate('shared_with', 'name');

    res.status(201).json(file);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get files for group
router.get('/', auth, async (req, res) => {
  try {
    const files = await File.find({
      group_id: req.user.group_id
    })
    .populate('shared_by', 'name')
    .populate('shared_with', 'name')
    .sort({ uploaded_at: -1 });

    res.json(files);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;