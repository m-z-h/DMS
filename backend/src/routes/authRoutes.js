const express = require('express');
const { register, login, getMe, checkAdminExists } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/check-admin-exists', checkAdminExists);

module.exports = router; 