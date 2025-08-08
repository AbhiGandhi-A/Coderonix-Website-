const mongoose = require('mongoose');

const DocSchema = new mongoose.Schema({
    folder_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        required: true,
    },
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        default: '',
    },
    file_type: {
        type: String,
        enum: ['doc', 'code', 'file'],
        default: 'doc',
    },
    shared_with: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    shared_at: {
        type: Date
    },
    group_id: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

DocSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

module.exports = mongoose.model('Doc', DocSchema);
