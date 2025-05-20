const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  checkAdminExists, 
  getHospitals, 
  getDepartments 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/check-admin-exists', checkAdminExists);
router.get('/hospitals', getHospitals);
router.get('/departments', getDepartments);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router; 