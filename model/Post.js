const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    username: { type: String, required: true },
    title: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, required: true},
    description: { type: String, required: true },
    tags: [{ type: String }],
    image: { type: String },
    commentsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
});

module.exports = mongoose.model('Post', PostSchema);
