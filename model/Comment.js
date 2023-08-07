const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    profilepicture: { type: String, default: '../img/profiles/default.jpg' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    nestedComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    isEdited: { type: Boolean, default: false },
});

module.exports = mongoose.model('Comment', CommentSchema);
