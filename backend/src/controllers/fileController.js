const path = require('path');
const fs = require('fs');

// Upload a file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('File uploaded successfully:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // File has been uploaded and is available in req.file
    // Return file information
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

// Get all files for a specific patient
exports.getPatientFiles = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    console.log('Looking for files in:', uploadsDir);
    
    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('Uploads directory not found');
      return res.status(200).json({
        success: true,
        message: 'No uploads directory found',
        data: []
      });
    }
    
    // Read all files in the uploads directory
    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files in uploads directory`);
    
    // Get file details
    const fileDetails = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        originalname: filename.substring(filename.indexOf('-') + 1), // Remove timestamp prefix
        path: `/uploads/${filename}`,
        mimetype: getMimeType(filename),
        size: stats.size,
        createdAt: stats.birthtime
      };
    });
    
    res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: fileDetails
    });
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving files',
      error: error.message
    });
  }
};

// Helper function to determine MIME type based on file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

// Delete a file
exports.deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
}; 