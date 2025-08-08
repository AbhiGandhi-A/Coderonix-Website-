const express = require('express');
const router = express.Router();
const Doc = require('../models/Doc');
const Folder = require('../models/Folder');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get documents shared with the current user - MUST come before /:id route
router.get('/shared', authMiddleware, async (req, res) => {
    try {
        const docs = await Doc.find({ 
            shared_with: req.user.id 
        }).populate('owner_id', 'name');

        const docsWithOwnerName = docs.map(doc => ({
            ...doc.toObject(),
            owner_name: doc.owner_id ? doc.owner_id.name : 'Unknown'
        }));

        res.json(docsWithOwnerName);
    } catch (err) {
        console.error('Get shared docs error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Get a shared document (read-only access) - MUST come before /:id route
router.get('/shared/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Doc.findById(req.params.id).populate('owner_id', 'name');
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Check if document is shared with the user
        if (!doc.shared_with || !doc.shared_with.includes(req.user.id)) {
            return res.status(403).json({ message: 'Access denied: Document not shared with you' });
        }

        const docWithOwnerName = {
            ...doc.toObject(),
            owner_name: doc.owner_id ? doc.owner_id.name : 'Unknown'
        };

        res.json(docWithOwnerName);
    } catch (err) {
        console.error('Get shared document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Create a new document inside a folder
router.post('/', authMiddleware, async (req, res) => {
    const { folderId, title, content, group_id } = req.body;
    try {
        const folder = await Folder.findById(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Check if user belongs to the same group as the folder
        if (folder.group_id.toString() !== req.user.group_id.toString()) {
            return res.status(403).json({ message: 'Access denied: You are not in the same group' });
        }

        const newDoc = new Doc({
            folder_id: folderId,
            owner_id: req.user.id,
            title,
            content: content || '',
            group_id: group_id
        });

        await newDoc.save();
        folder.docs.push(newDoc._id);
        await folder.save();

        res.status(201).json(newDoc);
    } catch (err) {
        console.error('Create document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Get a single document by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Doc.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        const folder = await Folder.findById(doc.folder_id);
        if (!folder) {
            return res.status(404).json({ message: 'Parent folder not found' });
        }

        // Allow access if user is in the same group OR if document is shared with them
        const hasGroupAccess = folder.group_id.toString() === req.user.group_id.toString();
        const hasSharedAccess = doc.shared_with && doc.shared_with.includes(req.user.id);

        if (!hasGroupAccess && !hasSharedAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(doc);
    } catch (err) {
        console.error('Get document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Update a document
router.put('/:id', authMiddleware, async (req, res) => {
    const { title, content } = req.body;
    try {
        const doc = await Doc.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Allow update if user owns the document OR if user is in the same group
        const folder = await Folder.findById(doc.folder_id);
        const isOwner = doc.owner_id.toString() === req.user.id;
        const isSameGroup = folder && folder.group_id.toString() === req.user.group_id.toString();

        if (!isOwner && !isSameGroup) {
            return res.status(403).json({ message: 'Access denied: You cannot edit this document' });
        }

        // Update the document
        const updatedDoc = await Doc.findByIdAndUpdate(
            req.params.id,
            {
                title: title !== undefined ? title : doc.title,
                content: content !== undefined ? content : doc.content,
                updated_at: new Date()
            },
            { new: true }
        );

        res.json(updatedDoc);
    } catch (err) {
        console.error('Update document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Delete a document
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Doc.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Only owner can delete
        if (doc.owner_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied: You do not own this document' });
        }

        // Use findByIdAndDelete instead of doc.remove()
        await Doc.findByIdAndDelete(req.params.id);
        
        // Remove from folder's docs array
        await Folder.findByIdAndUpdate(
            doc.folder_id, 
            { $pull: { docs: doc._id } },
            { new: true }
        );

        res.json({ message: 'Document removed' });
    } catch (err) {
        console.error('Delete document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Share a document with group members
router.post('/:id/share', authMiddleware, async (req, res) => {
    const { sharedWith, group_id } = req.body;
    try {
        const doc = await Doc.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }

        // Only owner can share
        if (doc.owner_id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied: You do not own this document' });
        }

        // Verify all users belong to the same group
        const users = await User.find({ 
            _id: { $in: sharedWith }, 
            group_id: group_id 
        });

        if (users.length !== sharedWith.length) {
            return res.status(400).json({ message: 'Some users do not belong to your group' });
        }

        // Update document with shared users
        doc.shared_with = [...new Set([...(doc.shared_with || []), ...sharedWith])];
        doc.shared_at = new Date();
        await doc.save();

        res.json({ message: 'Document shared successfully', doc });
    } catch (err) {
        console.error('Share document error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
