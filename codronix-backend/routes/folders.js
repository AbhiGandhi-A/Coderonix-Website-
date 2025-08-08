const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Doc = require('../models/Doc');
const authMiddleware = require('../middleware/auth');

// Get all folders for a specific group
router.get('/group/:groupId', authMiddleware, async (req, res) => {
    try {
        const { groupId } = req.params;
        // Verify user belongs to the group
        if (req.user.group_id.toString() !== groupId) {
            return res.status(403).json({ message: 'Access denied: You do not belong to this group' });
        }
        const folders = await Folder.find({ group_id: groupId }).populate('docs');
        res.json(folders);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new folder
router.post('/', authMiddleware, async (req, res) => {
    const { name, group_id } = req.body;
    try {
        const newFolder = new Folder({
            name,
            group_id: group_id,
            created_by: req.user.id,
        });
        await newFolder.save();
        res.status(201).json(newFolder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get a single folder and its contents
router.get('/:id/contents', authMiddleware, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id).populate('docs');
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        // Check if the user is a member of the folder's group
        if (folder.group_id.toString() !== req.user.group_id.toString()) {
             return res.status(403).json({ message: 'Access denied: You are not in the same group' });
        }
        res.json(folder);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Delete a folder and all its contents
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        // Check ownership before deleting
        if (folder.created_by.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied: You do not own this folder' });
        }
        
        await Doc.deleteMany({ folder_id: folder._id });
        await Folder.findByIdAndDelete(req.params.id);

        res.json({ message: 'Folder and its contents removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;