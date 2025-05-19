const express = require('express');
const multer = require('multer');
const path = require('path');
const { uploadFile, getPatientFiles, deleteFile } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function(req, file, cb) {
    // Create a unique filename using timestamp + original name
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to only accept certain file types
const fileFilter = (req, file, cb) => {
  // Accept pdf, jpg, and png files
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Routes
router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/patient', protect, getPatientFiles);
router.delete('/:filename', protect, deleteFile);

module.exports = router; 