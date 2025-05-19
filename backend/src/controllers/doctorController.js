const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const AccessGrant = require('../models/AccessGrant');
const AccessRequest = require('../models/AccessRequest');
const ABEEncryption = require('../utils/abeEncryption');

// Get all patients under the doctor
exports.getMyPatients = async (req, res) => {
  try {
    // Get doctor details from user ID
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find medical records for this doctor to get unique patients
    const records = await MedicalRecord.find({ 
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode
    });

    // Extract unique patient IDs
    const patientIds = [...new Set(records.map(record => record.patientId))];
    
    // Get patient details
    const patients = await Patient.find({
      _id: { $in: patientIds }
    }).populate('userId', 'username email');

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all medical records for a specific patient
exports.getPatientRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find all records for this patient created by this doctor
    const records = await MedicalRecord.find({ 
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode
    }).sort({ createdAt: -1 });

    // Decrypt any encrypted records
    const decryptedRecords = records.map(record => {
      const recordObj = record.toObject();
      
      if (recordObj.isEncrypted) {
        try {
          // User attributes from the doctor's profile
          const userAttributes = {
            hospital: req.user.hospitalCode,
            department: req.user.departmentCode
          };
          
          // Attempt to decrypt
          const decryptedData = ABEEncryption.decrypt(recordObj, userAttributes);
          if (decryptedData) {
            return { ...recordObj, ...decryptedData, isDecrypted: true };
          }
        } catch (err) {
          console.error('Decryption error:', err);
        }
      }
      
      return recordObj;
    });

    res.status(200).json({
      success: true,
      count: decryptedRecords.length,
      data: decryptedRecords
    });
  } catch (error) {
    console.error('Error getting patient records:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new medical record
exports.createMedicalRecord = async (req, res) => {
  try {
    const { 
      patientId, 
      recordType, 
      diagnosis, 
      prescription,
      notes,
      vital,
      labResults,
      shouldEncrypt = false
    } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Prepare record data
    let recordData = {
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode,
      recordType,
      diagnosis,
      prescription,
      notes,
      vital,
      labResults
    };

    // Apply encryption if requested
    if (shouldEncrypt) {
      // Attributes for encryption policy
      const attributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      // Encrypt sensitive data
      const sensitiveData = {
        diagnosis,
        prescription,
        notes,
        vital,
        labResults
      };
      
      const encryptedObject = ABEEncryption.encrypt(sensitiveData, attributes);
      
      // Update record data with encrypted info
      recordData = {
        patientId,
        doctorId: doctor._id,
        hospitalCode: req.user.hospitalCode,
        departmentCode: req.user.departmentCode,
        recordType,
        diagnosis: shouldEncrypt ? '[Encrypted]' : diagnosis,
        prescription: shouldEncrypt ? '[Encrypted]' : prescription,
        notes: shouldEncrypt ? '[Encrypted]' : notes,
        vital: shouldEncrypt ? {} : vital,
        labResults: shouldEncrypt ? [] : labResults,
        isEncrypted: true,
        encryptedData: encryptedObject.encryptedData,
        encryptedKey: encryptedObject.encryptedKey,
        policy: encryptedObject.policy
      };
    }

    // Create the medical record
    const record = await MedicalRecord.create(recordData);

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error creating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update a medical record
exports.updateMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find record and check ownership
    const record = await MedicalRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }

    // Handle encryption if needed
    if (updateData.shouldEncrypt && !record.isEncrypted) {
      // Encrypt the record data
      const attributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      const sensitiveData = {
        diagnosis: updateData.diagnosis || record.diagnosis,
        prescription: updateData.prescription || record.prescription,
        notes: updateData.notes || record.notes,
        vital: updateData.vital || record.vital,
        labResults: updateData.labResults || record.labResults
      };
      
      const encryptedObject = ABEEncryption.encrypt(sensitiveData, attributes);
      
      // Update with encrypted data
      updateData.isEncrypted = true;
      updateData.encryptedData = encryptedObject.encryptedData;
      updateData.encryptedKey = encryptedObject.encryptedKey;
      updateData.policy = encryptedObject.policy;
      updateData.diagnosis = '[Encrypted]';
      updateData.prescription = '[Encrypted]';
      updateData.notes = '[Encrypted]';
      updateData.vital = {};
      updateData.labResults = [];
    } 
    // If removing encryption
    else if (updateData.shouldEncrypt === false && record.isEncrypted) {
      // Decrypt first
      const userAttributes = {
        hospital: req.user.hospitalCode,
        department: req.user.departmentCode
      };
      
      try {
        const decryptedData = ABEEncryption.decrypt(record.toObject(), userAttributes);
        if (decryptedData) {
          // Update with decrypted data plus any new changes
          updateData.isEncrypted = false;
          updateData.diagnosis = updateData.diagnosis || decryptedData.diagnosis;
          updateData.prescription = updateData.prescription || decryptedData.prescription;
          updateData.notes = updateData.notes || decryptedData.notes;
          updateData.vital = updateData.vital || decryptedData.vital;
          updateData.labResults = updateData.labResults || decryptedData.labResults;
          // Remove encryption fields
          updateData.$unset = { 
            encryptedData: 1, 
            encryptedKey: 1, 
            policy: 1 
          };
        }
      } catch (err) {
        return res.status(403).json({
          success: false,
          message: 'Cannot decrypt record - access denied'
        });
      }
    }

    // Remove helper field not in model
    delete updateData.shouldEncrypt;

    // Update the record
    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedRecord
    });
  } catch (error) {
    console.error('Error updating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Delete a medical record
exports.deleteMedicalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find record and check ownership
    const record = await MedicalRecord.findById(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }

    // Delete the record
    await record.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all appointments for this doctor
exports.getMyAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find appointments
    const appointments = await Appointment.find({
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode
    })
      .sort({ date: 1, time: 1 })
      .populate({
        path: 'patientId',
        select: 'fullName contactNo',
        populate: {
          path: 'userId',
          select: 'username email'
        }
      });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Create a new appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, date, time, duration, reason, status } = req.body;

    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patientId,
      doctorId: doctor._id,
      hospitalCode: req.user.hospitalCode,
      departmentCode: req.user.departmentCode,
      date,
      time,
      duration: duration || 30,
      reason,
      status: status || 'Scheduled'
    });

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Find appointment and check ownership
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if doctor owns this appointment
    if (appointment.doctorId.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    // Update the appointment
    appointment.status = status || appointment.status;
    if (notes) appointment.notes = notes;
    await appointment.save();

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Access patient data from other hospitals
exports.accessCrossHospitalData = async (req, res) => {
  try {
    const { patientId, accessCode } = req.body;

    // Validate patientId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check access authorization - three ways to get access:
    // 1. Using access code
    // 2. Having an active access grant
    // 3. Being in the same hospital and having treated the patient before
    let accessGranted = false;
    let accessMethod = '';
    
    // Check for existing access grants
    const grant = await AccessGrant.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      isActive: true,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (grant) {
      accessGranted = true;
      accessMethod = 'existing_grant';
    }
    
    // If no grant, check if they're in the same hospital with existing records
    if (!accessGranted) {
      // Check if doctor has previously created records for this patient in their hospital
      const existingRecord = await MedicalRecord.findOne({
        patientId: patient._id,
        doctorId: doctor._id,
        hospitalCode: req.user.hospitalCode
      });
      
      if (existingRecord) {
        accessGranted = true;
        accessMethod = 'same_hospital';
      }
    }
    
    // Finally, check access code if provided
    if (!accessGranted && accessCode) {
      if (patient.accessCode === accessCode) {
        accessGranted = true;
        accessMethod = 'access_code';
        
        // Create an access request record if it doesn't exist
        const existingRequest = await AccessRequest.findOne({
          patientId: patient._id,
          doctorId: doctor._id,
          status: 'approved'
        });
        
        if (!existingRequest) {
          await AccessRequest.create({
            patientId: patient._id,
            doctorId: doctor._id,
            message: `Access requested using access code on ${new Date().toISOString().split('T')[0]}`,
            accessLevel: 'read',
            status: 'approved',
            responseMessage: 'Auto-approved via access code',
            responseDate: new Date()
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Invalid access code'
        });
      }
    }
    
    // If no access method worked, deny access
    if (!accessGranted) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this patient\'s data. Request access or use a valid access code.'
      });
    }

    // Find all records for this patient across all hospitals
    const records = await MedicalRecord.find({
      patientId: patient._id
    }).sort({ createdAt: -1 });

    // Filter and decrypt records
    const accessibleRecords = records.map(record => {
      const recordObj = record.toObject();
      
      // If it's from this doctor's hospital, return as is
      if (recordObj.hospitalCode === req.user.hospitalCode) {
        return recordObj;
      }
      
      // For cross-hospital records, attempt to decrypt if encrypted
      if (recordObj.isEncrypted) {
        try {
          // User attributes from the doctor's profile
          // For cross-hospital, just the department matters (not the hospital)
          const userAttributes = {
            department: req.user.departmentCode
          };
          
          // Attempt to decrypt
          const decryptedData = ABEEncryption.decrypt(recordObj, userAttributes);
          if (decryptedData) {
            return { 
              ...recordObj, 
              ...decryptedData, 
              isDecrypted: true,
              crossHospitalAccess: true
            };
          }
        } catch (err) {
          console.error('Cross-hospital decryption error:', err);
        }
        
        // Return encrypted record with access denied flag
        return {
          ...recordObj,
          accessDenied: true,
          crossHospitalAccess: true
        };
      }
      
      // Return non-encrypted record with cross-hospital flag
      return {
        ...recordObj,
        crossHospitalAccess: true
      };
    });

    res.status(200).json({
      success: true,
      count: accessibleRecords.length,
      accessMethod,
      data: accessibleRecords
    });
  } catch (error) {
    console.error('Error accessing cross-hospital data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Request access to a patient's data
exports.requestPatientAccess = async (req, res) => {
  try {
    const { patientId, message, accessLevel } = req.body;
    
    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    
    // Check if there's already an active request
    const existingRequest = await AccessRequest.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending access request for this patient',
        data: existingRequest
      });
    }
    
    // Check if doctor already has access
    const existingGrant = await AccessGrant.findOne({
      patientId: patient._id,
      doctorId: doctor._id,
      isActive: true
    });
    
    if (existingGrant) {
      return res.status(400).json({
        success: false,
        message: 'You already have access to this patient\'s data',
        data: existingGrant
      });
    }
    
    // Create access request
    const accessRequest = await AccessRequest.create({
      patientId: patient._id,
      doctorId: doctor._id,
      message,
      accessLevel: accessLevel || 'read'
    });
    
    res.status(201).json({
      success: true,
      message: 'Access request sent successfully',
      data: accessRequest
    });
  } catch (error) {
    console.error('Error requesting patient access:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all access requests made by the doctor
exports.getMyAccessRequests = async (req, res) => {
  try {
    // Get doctor details
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    
    // Get all requests by this doctor
    const requests = await AccessRequest.find({
      doctorId: doctor._id
    })
    .sort({ requestedAt: -1 })
    .populate({
      path: 'patientId',
      select: 'fullName',
      populate: {
        path: 'userId',
        select: 'email'
      }
    });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error getting access requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 