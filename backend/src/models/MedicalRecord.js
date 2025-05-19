const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  hospitalCode: {
    type: String,
    required: true
  },
  departmentCode: {
    type: String,
    required: true
  },
  recordType: {
    type: String,
    enum: ['general', 'lab', 'prescription', 'vitals', 'notes'],
    default: 'general'
  },
  diagnosis: {
    type: String,
    required: true
  },
  prescription: {
    type: String
  },
  notes: {
    type: String
  },
  vital: {
    temperature: { type: Number },
    bloodPressure: { type: String },
    heartRate: { type: Number },
    sugarLevel: { type: Number }
  },
  labResults: [{
    testName: { type: String },
    testValue: { type: String },
    normalRange: { type: String },
    date: { type: Date }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionDetails: {
    policyId: { type: String },
    encryptionAlgorithm: { type: String }
  }
});

// Update the updatedAt field on save
medicalRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord; 