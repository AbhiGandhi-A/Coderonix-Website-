const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    group_id: {
        type: String,
        required: true,
    },
    parent_folder: {
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        default: null,
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    docs: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Doc'
        }
    ],
    created_at: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Folder', folderSchema);