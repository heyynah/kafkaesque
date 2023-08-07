const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        profilepicture: { type: String, default: '../img/profiles/default.jpg' },
        displayname: {
            type: String,
            default: function() {
                return this.username;
            }
        },
        location: { type: String, default: " "},
        bio: { type: String, default: " "},
        upvotedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
        downvotedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
        upvotedComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
        downvotedComments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    },
    { collection: 'users' }
);

const User = mongoose.model('User', UserSchema);

module.exports = User;
