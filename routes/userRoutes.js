const express = require('express');
const router = express.Router();
const User = require('../model/User');
const path = require('path');
const bcrypt = require('bcrypt');

const multer = require('multer');
const { Console } = require('console');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './view/img/profiles')
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({storage: storage});

router.post('/login', async (req, res) => {
    const { username, password, remember } = req.body;
    const user = await User.findOne({ username }).lean();

    if (!user) {
        return res.json({ status: 'error', error: 'No user' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        return res.json({ status: 'error', error: 'Wrong Password' });
    }
    
    req.session.user = {
        username,
        password,
    };

    if (remember) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 21;
    }

    res.json({ status: 'ok', data: user });
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'ok' });
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password with a salt factor of 10
        const response = await User.create({
            username,
            password: hashedPassword // Store the hashed password in the database
        });
        console.log('User created successfully: ', response);

    } catch (error) {
        console.log(error);
        return res.json({ status: 'error' });
    }
    res.json({ status: 'ok' });
});


router.get('/profile/:username', async (req, res) => {
    const username = req.params.username;

    try {
        const userDetails = await User.findOne({ username });

        if (!userDetails) {
            return res.status(404).json({ status: 'error', error: 'User not found' });
        }

        res.json({ status: 'ok', data: userDetails });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ status: 'error', error: 'Internal server error' });
    }
});

router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ status: 'unauthorized', message: 'User is not authenticated' });
    }

    const user = req.session.user;

    try {
        const userDetails = await User.findOne({ username: user.username });

        if (!userDetails) {
            return res.status(404).json({ status: 'error', error: 'User not found' });
        }

        res.json({ status: 'ok', data: userDetails });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ status: 'error', error: 'Internal server error' });
    }
});

router.post('/editProfile', upload.single('profilepicture'), async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ status: 'error', error: 'Unauthorized' });
        }

        const userDetails = await User.findOne({ username: req.session.user.username });

        if (!userDetails) {
            return res.status(404).json({ status: 'error', error: 'User not found' });
        }

        console.log('Received form data:', req.body);

        if (req.file) {
            userDetails.profilepicture = '/img/profiles/' + req.file.filename;
        }

        if (req.body.displayname) userDetails.displayname = req.body.displayname;
        if (req.body.location) userDetails.location = req.body.location;
        if (req.body.bio) userDetails.bio = req.body.bio;

        await userDetails.save();
        console.log('User updated successfully:', userDetails);

        req.session.user = {
            username: userDetails.username,
            password: userDetails.password,
        };

        res.json({ status: 'ok', data: userDetails });
    } catch (err) {
        console.error(err);
        return res.json({ status: 'error', error: 'An error occurred while updating profile' });
    }
});


router.delete('/deleteAccount', async (req, res) => {
    const { username } = req.session.user;
  
    try {
      await User.findOneAndDelete({ username });

      req.session.destroy();
  
      res.json({ status: 'ok', message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ status: 'error', error: 'An error occurred while deleting user' });
    }
});


module.exports = router;