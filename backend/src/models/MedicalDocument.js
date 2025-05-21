const mongoose = require('mongoose');

const medicalDocumentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false // Make it optional to support doctor profile photos
  },
  // Add uploaderId to track who uploaded the document
  uploaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  // Add a field to indicate if this is a profile photo
  isProfilePhoto: {
    type: Boolean,
    default: false
  },
  filename: {
    type: String,
    required: true
  },
  originalname: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  fileData: {
    type: Buffer,  // Store the actual file content as binary data
    required: true
  },
  documentType: {
    type: String,
    enum: ['Lab Report', 'Prescription', 'Scan Report', 'Insurance', 'Profile Photo', 'Other'],
    default: 'Other'
  },
  description: {
    type: String,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Create index on patientId for efficient queries
medicalDocumentSchema.index({ patientId: 1 });
// Add index on uploaderId
medicalDocumentSchema.index({ uploaderId: 1 });

// Update lastModifiedAt on save
medicalDocumentSchema.pre('save', function(next) {
  this.lastModifiedAt = Date.now();
  next();
});

module.exports = mongoose.model('MedicalDocument', medicalDocumentSchema); 