const path = require('path');
const fs = require('fs');
const MedicalDocument = require('../models/MedicalDocument');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { checkPatientAccess } = require('../utils/accessUtils');

// Upload a medical document
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    console.log('Processing file upload:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user.username,
      role: req.user.role
    });

    // Read file data from buffer
    const fileData = req.file.buffer;
    
    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: 'File data not available'
      });
    }
    
    // Generate a unique filename to prevent collisions
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${req.file.originalname.replace(/\s+/g, '_')}`;
    
    // Save file to disk for images (for profile photos)
    if (req.file.mimetype.startsWith('image/')) {
      const filePath = path.join(__dirname, '../../uploads', uniqueFilename);
      
      try {
        fs.writeFileSync(filePath, fileData);
        console.log('File saved to disk:', filePath);
      } catch (diskError) {
        console.error('Error saving file to disk:', diskError);
        // Continue even if disk save fails - we'll store in DB anyway
      }
    }

    // Create document metadata in database 
    let patientId = null;
    const isProfilePhoto = req.body.isProfilePhoto === 'true' || req.query.isProfilePhoto === 'true';
    let documentType = req.body.documentType || 'Other';
    
    // If it's a profile photo, mark it as such
    if (isProfilePhoto || req.file.mimetype.startsWith('image/')) {
      documentType = 'Profile Photo';
    }
    
    // If user is a Patient, find their patient ID
    if (req.user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: req.user.id });
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient profile not found'
        });
      }
      
      patientId = patient._id;
    }
    
    const description = req.body.description || '';
    
    // Create medical document with the user's ID - this works for both patient and doctor uploads
    const medicalDocument = await MedicalDocument.create({
      patientId,  // May be null for doctor uploads
      uploaderId: req.user.id,
      isProfilePhoto: isProfilePhoto || req.file.mimetype.startsWith('image/'),
      filename: uniqueFilename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fileData: fileData,
      documentType,
      description
    });

    // Return document information (excluding the binary data for response size)
    const responseDocument = medicalDocument.toObject();
    delete responseDocument.fileData;
    
    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      document: responseDocument
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

// Get all medical documents for the logged-in patient
exports.getPatientFiles = async (req, res) => {
  try {
    // Find patient ID from logged in user
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find all documents for this patient that aren't marked as deleted
    const documents = await MedicalDocument.find({ 
      patientId: patient._id,
      isDeleted: false 
    })
    .select('-fileData') // Exclude binary data from the results
    .sort({ uploadedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('Error retrieving patient documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving medical documents',
      error: error.message
    });
  }
};

// Get a specific file by ID
exports.getFileById = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Find patient ID from logged in user
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find document and verify ownership
    const document = await MedicalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Check ownership for patient or doctor access
    if (req.user.role === 'Patient' && document.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this document'
      });
    }
    
    // For doctors, check if they have access to this patient's records
    if (req.user.role === 'Doctor') {
      const doctorId = await Doctor.findOne({ userId: req.user.id });
      if (!doctorId) {
        return res.status(404).json({
          success: false, 
          message: 'Doctor profile not found'
        });
      }
      
      // Check if doctor has access to patient records
      const accessInfo = await checkPatientAccess(doctorId._id, document.patientId);
      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this patient\'s records'
        });
      }
    }
    
    // Set the correct content type
    res.set('Content-Type', document.mimetype);
    res.set('Content-Disposition', `inline; filename="${document.originalname}"`);
    
    // Send the file data
    return res.send(document.fileData);
    
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file',
      error: error.message
    });
  }
};

// Update document metadata (document type or description)
exports.updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { documentType, description } = req.body;
    
    // Find patient ID from logged in user
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find document and verify ownership
    const document = await MedicalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    if (document.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this document'
      });
    }
    
    // Update document
    if (documentType) document.documentType = documentType;
    if (description !== undefined) document.description = description;
    
    await document.save();
    
    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating document',
      error: error.message
    });
  }
};

// Delete a medical document (complete removal from database)
exports.deleteFile = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Find patient ID from logged in user
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find document and verify ownership
    const document = await MedicalDocument.findById(documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    if (document.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document'
      });
    }
    
    // Completely delete the document from database
    await MedicalDocument.findByIdAndDelete(documentId);

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
      error: error.message
    });
  }
};

// Permanently delete a file from disk
exports.permanentlyDeleteFile = async (req, res) => {
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
      message: 'File permanently deleted successfully'
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