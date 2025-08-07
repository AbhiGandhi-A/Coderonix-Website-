// routes/folders.js
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder'); // Adjust path as necessary
const auth = require('../middleware/auth'); // Assuming you have an auth middleware
const mongoose = require('mongoose');

// @route  POST api/folders
// @desc   Create a new folder
// @access Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, parent_folder, group_id } = req.body;
    if (!name || !group_id) {
      return res.status(400).json({ msg: 'Folder name and group_id are required' });
    }

    const newFolder = new Folder({
      name,
      group_id,
      parent_folder: parent_folder || null,
      created_by: req.user.id, // Assuming auth middleware adds user id to request
    });

    const folder = await newFolder.save();
    res.status(201).json(folder);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route  GET api/folders
// @desc   Get top-level folders and files
// @access Private
router.get('/', auth, async (req, res) => {
  try {
    const { group_id } = req.query;
    if (!group_id) {
      return res.status(400).json({ msg: 'Group ID is required' });
    }

    const folders = await Folder.find({ group_id, parent_folder: null });
    const files = await File.find({ group_id, folder_id: null }); // Assuming File model exists

    res.json({ folders, files });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route  GET api/folders/:id
// @desc   Get content of a specific folder
// @access Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: 'Invalid folder ID' });
    }

    const folders = await Folder.find({ parent_folder: id });
    const files = await File.find({ folder_id: id });

    res.json({ folders, files });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;