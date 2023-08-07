const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const app = express();

const PORT = 3000;

mongoose.connect('mongodb+srv://hannahteves:imdumb111@kafkaesquedb.xfkeyo8.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "kafkakakakaka"
    })
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB...'));

const store = new MongoDBStore({
    uri: 'mongodb+srv://hannahteves:imdumb111@kafkaesquedb.xfkeyo8.mongodb.net/',
    collection: 'sessions'
});

store.on('error', function (error) {
    console.error('Session store error:', error);
});

app.use(session({
    secret: 'some secret string',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 21,
    } 
}));

app.use('/', express.static(path.join(__dirname, '/view'), {index:false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.get('/api/posts/:postId', (req, res) => {
    const postId = req.params.postId;
    const postDetails = postsData[postId];
  
    if (postDetails) {
      // Return the post details as a JSON response
      res.json(postDetails);
    } else {
      res.status(404).json({ error: 'Post not found' });
    }
 });

app.use('/api', userRoutes);
app.use('/api', postRoutes);

app.post('/api/logout', (req, res) => {
    const { token } = req.body;

    if (token && loggedInUsers[token]) {
      delete loggedInUsers[token];

      res.clearCookie('authToken');
  
      return res.status(200).json({ message: 'Logout successful.' });
    }
  
    return res.status(401).json({ message: 'Invalid token or user not logged in.' });
});

app.listen(PORT, () => {
    console.log('Server up at 3000');
});
