const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import the file system module
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

/**
 * @route   POST /api/files/upload
 * @desc    Uploads a new file
 * @access  Private
 */
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

    // Save the file to the database
    await file.save();

    // Fetch the newly created file to ensure all fields are populated correctly
    const populatedFile = await File.findById(file._id)
      .populate('shared_by', 'name')
      .populate('shared_with', 'name');

    if (!populatedFile) {
      return res.status(500).json({ message: 'Error retrieving saved file.' });
    }

    res.status(201).json(populatedFile);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/files
 * @desc    Get all files for the authenticated user's group
 * @access  Private
 */
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

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file by ID
 * @access  Private (only the uploader can delete)
 */
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.shared_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    const filePath = path.join(__dirname, '..', '..', file.file_path);

    fs.unlink(filePath, async (err) => {
      if (err) {
        console.error(`Failed to delete file from disk: ${filePath}`, err);
      }

      await file.deleteOne();

      res.status(200).json({ message: 'File deleted successfully' });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;