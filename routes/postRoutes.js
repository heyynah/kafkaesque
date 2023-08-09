const express = require('express');
const app = express();
const path = require('path');

const router = express.Router();
const Post = require('../model/Post');
const Comment = require('../model/Comment');
const User = require('../model/User');

const multer = require('multer');
const { start } = require('repl');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './view/img/posts')
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({storage: storage});

router.get('/totalposts', async (req, res) => {
  try {
    const posts = await Post.find({}).lean();
    res.json(posts.length);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Error fetching posts. Please try again later.');
  }
});

router.get('/displayPosts/:sortBy', async (req, res) => {
  try {
      const sortBy = req.params.sortBy;
      const page = req.query.page;
      const limit = req.query.limit;

      let posts;
    
      if (sortBy === 'popular') {
          posts = await Post.find({}).sort({ upvotes: -1 }).lean();
      } else {
          posts = await Post.find({}).sort({ createdAt: -1 }).lean();
      }


      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      const results = {};
      
      results.results = posts.slice(startIndex, endIndex);

      res.json(results.results);       
  } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).send('Error fetching posts. Please try again later.');
  }
});

router.get('/post/:postId', async (req, res) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Error fetching post. Please try again later.' });
  }
});


router.get('/user-posts', async (req, res) => {
  try {
    const username = req.session.user.username;

    let filter = {};
    if (username) {
      filter = { username };
    }

    const posts = await Post.find(filter).sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/user-posts/:username', async (req, res) => {
  const username = req.params.username;

  try {
    let filter = {};
    if (username) {
      filter = { username };
    }

    const posts = await Post.find(filter).sort({ upvotes: -1 });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/add-post', upload.single('image'), async (req, res) => {
    try {
        const { title, description, categories } = req.body;

        const newPost = new Post({
            username: req.session.user.username,
            title,
            createdAt: new Date(),
            description,
            tags: JSON.parse(categories) || [],
            commentsCount: 0,
            views: 0,
            upvotes: 0,
            downvotes: 0,
        });

        if (req.file) {
          newPost.image = '/img/posts/' + req.file.filename;
        }

        await newPost.save();

        res.redirect('/html/home.html');
    } catch (error) {
        console.error('Error adding post:', error);
        res.status(500).send('Error adding post. Please try again later.');
    }
});

router.patch('/posts/:postId/vote', async (req, res) => {
  const { postId } = req.params;
  const { voteType } = req.body;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Comment not found' });
    }

     // Access user's ID from the session
     const username = req.session.user.username;
     const loggedInUser = await User.findOne({ username });
     const userId = loggedInUser._id;
 
     if (!loggedInUser) {
       return res.status(401).json({ error: 'User not authenticated' });
     }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

      if (voteType === 'upvote') {
          post.upvotes += 1;
          user.upvotedPosts.push(postId);
      } else if (voteType === 'downvote') {
          post.downvotes += 1;
          user.downvotedPosts.push(postId);
      } else if (voteType === 'remove_upvote') {
          post.upvotes -= 1;
          user.upvotedPosts = user.upvotedPosts.filter(id => id.toString() !== postId);
      } else if (voteType === 'remove_downvote') {
          post.downvotes -= 1;
          user.downvotedPosts = user.downvotedPosts.filter(id => id.toString() !== postId);
      } else {
          return res.status(400).json({ error: 'Invalid voteType' });
      }

      await post.save();
      await user.save();

      return res.status(200).json({ message: 'Vote count and user data updated successfully' });
  } catch (error) {
      console.error('Error updating vote count:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/getUserVotedComments', async (req, res) => {
  try {
      const username = req.session.user.username;

      // Find the user by their username
      const user = await User.findOne({ username });

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const upvotedComments = user.upvotedComments;
      const downvotedComments = user.downvotedComments;

      res.status(200).json({ upvotedComments, downvotedComments });
  } catch (error) {
      console.error('Error retrieving user voted comments:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/commentsVote/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const { voteType } = req.body;

  console.log(voteType);
  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Access user's ID from the session
    const username = req.session.user.username;
    const loggedInUser = await User.findOne({ username });
    const userId = loggedInUser._id;

    if (!loggedInUser) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

   if (!userId) {
     return res.status(401).json({ error: 'User not authenticated' });
   }

   const user = await User.findById(userId);

    if (voteType === 'upvote') {
      comment.upvotes += 1;
      user.upvotedComments.push(commentId);
    } else if (voteType === 'downvote') {
      comment.downvotes += 1;
      user.downvotedComments.push(commentId);
    } else if (voteType === 'remove_upvote') {
      comment.upvotes -= 1;
      user.upvotedComments = user.upvotedComments.filter(id => id.toString() !== commentId);
      console.log(user.upvotedComments);
    } else if (voteType === 'remove_downvote') {
      comment.downvotes -= 1;
      user.downvotedComments = user.downvotedComments.filter(id => id.toString() !== commentId);
    } else {
      return res.status(400).json({ error: 'Invalid voteType' });
    }

    await comment.save();
    await user.save();

    return res.status(200).json({ message: 'Vote count and user data updated successfully' });
  } catch (error) {
    console.error('Error updating vote count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/views/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.views++;
    await post.save();

    res.json({ message: 'Post views updated successfully' });
  } catch (error) {
    console.error('Error updating post views:', error);
    res.status(500).json({ message: 'Error updating post views' });
  }
});

router.get('/comments/:postId', async (req, res) => {
  const postId = req.params.postId;

  try {
    const filter = { postId };
    const comments = await Comment.find(filter);

    if (comments.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/getCommentData/:commentId', async (req, res) => {
  const commentId = req.params.commentId;

  try {
    const filter = { _id: commentId };
    const comment = await Comment.findOne(filter);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    return res.status(200).json(comment);
  } catch (error) {
    console.error('Error fetching comment:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/userComments/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const filter = { username };
    const comments = await Comment.find(filter);

    if (comments.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/addComments/:postId', async (req, res) => {
  if (req.session.user) {
    const { postId } = req.params;
    const { content } = req.body;

    const username = req.session.user.username;
    const user = await User.findOne({ username });

    try {
      // Create a new comment and save it to the database
      const newComment = new Comment({
        username: username,
        profilepicture: user.profilepicture,
        content: content,
        postId: postId,
        createdAt: new Date(),
        upvotes: 0,
        downvotes: 0,
        parentId: null,
      });

      // Save the new comment to the database
      const savedComment = await newComment.save();

      // Increment the comment count on the parent post
      const parentPost = await Post.findById(postId);
      if (!parentPost) {
        return res.status(404).json({ error: 'Parent post not found' });
      }

      parentPost.commentsCount = parentPost.commentsCount + 1;
      await parentPost.save();

      // Return the new comment as a JSON response
      return res.status(201).json({ comment: savedComment });
    } catch (error) {
      // Handle any errors that occur during the database query
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/addReply/:postId/:parentId', async (req, res) => {
  if (req.session.user) {
    const { postId, parentId } = req.params;
    const { content } = req.body;

    const username = req.session.user.username;
    const user = await User.findOne({ username });

    try {
      // Check if the parent comment exists
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Create a new comment and save it to the database
      const newComment = new Comment({
        username: username,
        profilepicture: user.profilepicture,
        content: content,
        postId: postId,
        createdAt: new Date(),
        upvotes: 0,
        downvotes: 0,
        parentId: parentId,
      });

      // Save the new comment to the database
      const savedComment = await newComment.save();

      // Add the new comment to the nested comments array of the parent comment
      parentComment.nestedComments.push(savedComment._id);
      await parentComment.save();

      // Increment the comment count on the parent post
      const parentPost = await Post.findById(postId);
      if (!parentPost) {
        return res.status(404).json({ error: 'Parent post not found' });
      }

      parentPost.commentsCount = parentPost.commentsCount + 1;
      await parentPost.save();

      // Return the new comment as a JSON response
      return res.status(201).json({ comment: savedComment });
    } catch (error) {
      // Handle any errors that occur during the database query
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});


router.get('/results/:searchQuery', async (req, res) => {
  const searchQuery = req.params.searchQuery;
  const searchResults = { posts: [], accounts: [] };

  if (searchQuery.trim() !== '') {
    try {
      // Search in posts for matching titles
      searchResults.posts = await Post.find({ title: { $regex: searchQuery, $options: 'i' } }).lean();

      searchResults.accounts = await User.find({
        $or: [
          { username: { $regex: searchQuery, $options: 'i' } },
          { name: { $regex: searchQuery, $options: 'i' } }
        ]
      }).lean();

    } catch (error) {
      console.error('Error fetching search results:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.json(searchResults);
});

router.delete("/deleteComment/:postId/:commentId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    // Check if the comment with the given commentId exists in the database
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const parentPost = await Post.findById(postId);
    if (!parentPost) {
      return res.status(404).json({ error: 'Parent post not found' });
    }

    const parentCommentId = comment.parentId; // Assuming you have a parentId field in your comment schema

    // If the comment has a parent, find and update the parent comment
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        parentComment.nestedComments = parentComment.nestedComments.filter(id => id.toString() !== commentId);
        await parentComment.save();
      }
    }

    // Remove commentId from nestedComments
    async function removeCommentFromNestedComments(nestedComments) {
      for (const nestedCommentId of nestedComments) {
        const nestedComment = await Comment.findById(nestedCommentId);
        if (nestedComment) {
          nestedComment.nestedComments = nestedComment.nestedComments.filter(id => id.toString() !== commentId);
          await nestedComment.save();
          await removeCommentFromNestedComments(nestedComment.nestedComments);
        }
      }
    }

    await removeCommentFromNestedComments(comment.nestedComments);

    parentPost.commentsCount = parentPost.commentsCount - 1;
    await parentPost.save();

    await Comment.findByIdAndDelete(commentId);

    // Return a success response
    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



router.patch("/editPost/:postId", async (req, res) => {
  try {
      const postId = req.params.postId;
      const { title, description } = req.body;

      // Check if the post with the given postId exists in the database
      const existingPost = await Post.findById(postId);

      if (!existingPost) {
          return res.status(404).json({ error: 'Post not found' });
      }

      // Update the post title and description
      existingPost.title = title;
      existingPost.description = description;
      existingPost.isEdited = true;
      
      // Save the updated post
      const updatedPost = await existingPost.save();

      // Respond with the updated post data
      res.status(200).json({ data: updatedPost });
  } catch (error) {
      console.error('Error editing post:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch("/editComment/:commentId", async (req, res) => {
  try {
      const commentId = req.params.commentId;
      const { content } = req.body;

      // Check if the comment with the given commentId exists in the database
      const existingComment = await Comment.findById(commentId);

      if (!existingComment) {
          return res.status(404).json({ error: 'Comment not found' });
      }

      // Update the comment content
      existingComment.content = content;
      existingComment.isEdited = true;
      
      // Save the updated comment
      const updatedComment = await existingComment.save();

      // Respond with the updated comment data
      res.status(200).json({ data: updatedComment });
  } catch (error) {
      console.error('Error editing comment:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete("/deletePost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;

    // Check if the post with the given postId exists in the database
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await Comment.deleteMany({ postId });

    await Post.findByIdAndDelete(postId);

    // Return a success response
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}); 

module.exports = router;