const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const AccessGrant = require('../models/AccessGrant');
const { generatePDF } = require('../utils/pdfGenerator');

// Get all medical records for the logged-in patient
exports.getMyRecords = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Find all records for this patient
    const records = await MedicalRecord.find({ 
      patientId: patient._id
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
    });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
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

// Download patient medical report as PDF
exports.downloadMedicalReport = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id }).populate('userId', 'username email');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Find patient's most recent records
    const recentRecords = await MedicalRecord.find({ 
      patientId: patient._id
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
    });

    // Find upcoming appointments
    const appointments = await Appointment.find({
      patientId: patient._id,
      date: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
    .sort({ date: 1, time: 1 })
    .limit(3)
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
    });

    // Generate PDF with patient data
    const pdfBuffer = await generatePDF({
      reportType: 'patientSummary',
      patientName: patient.fullName,
      patientId: patient._id,
      dateOfBirth: patient.dateOfBirth,
      contactNo: patient.contactNo,
      address: patient.address,
      records: recentRecords,
      appointments: appointments,
      accessCode: patient.accessCode,
      generatedDate: new Date()
    });
    
    // Return PDF data
    res.status(200).json({
      success: true,
      data: {
        pdfData: pdfBuffer.toString('base64'),
        filename: `${patient.fullName.replace(/\s+/g, '_')}_medical_report.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating medical report:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all appointments for the logged-in patient
exports.getMyAppointments = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Find all appointments for this patient
    const appointments = await Appointment.find({
      patientId: patient._id
    })
    .sort({ date: -1, time: -1 }) // Most recent first
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode contactNo',
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

// Request a new appointment
exports.requestAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Create appointment request
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      hospitalCode: doctor.hospitalCode,
      departmentCode: doctor.departmentCode,
      date,
      time,
      reason,
      status: 'Scheduled' // Initial status is always Scheduled
    });

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error requesting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Update patient personal information
exports.updatePersonalInfo = async (req, res) => {
  try {
    const { fullName, dateOfBirth, contactNo, address } = req.body;

    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Update fields if provided
    if (fullName) patient.fullName = fullName;
    if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
    if (contactNo) patient.contactNo = contactNo;
    if (address) patient.address = address;

    await patient.save();

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error updating patient info:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Model for access grants if not exists already
const createAccessGrantModel = () => {
  try {
    return mongoose.model('AccessGrant');
  } catch (error) {
    // If model doesn't exist, create it
    const accessGrantSchema = new mongoose.Schema({
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
      grantedAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: {
        type: Date,
        default: function() {
          // Default expiry is 30 days from now
          const date = new Date();
          date.setDate(date.getDate() + 30);
          return date;
        }
      },
      accessLevel: {
        type: String,
        enum: ['read', 'readWrite'],
        default: 'read'
      }
    });
    
    return mongoose.model('AccessGrant', accessGrantSchema);
  }
};

// Grant access to a doctor
exports.grantDoctorAccess = async (req, res) => {
  try {
    const { doctorId, accessLevel, expiryDays } = req.body;

    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Validate doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if access already granted
    const AccessGrant = createAccessGrantModel();
    let grant = await AccessGrant.findOne({
      patientId: patient._id,
      doctorId
    });

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    if (grant) {
      // Update existing grant
      grant.accessLevel = accessLevel || grant.accessLevel;
      grant.expiresAt = expiresAt;
      await grant.save();
    } else {
      // Create new grant
      grant = await AccessGrant.create({
        patientId: patient._id,
        doctorId,
        accessLevel: accessLevel || 'read',
        expiresAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Access granted successfully',
      data: grant
    });
  } catch (error) {
    console.error('Error granting access:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Revoke access from a doctor
exports.revokeDoctorAccess = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Find and delete access grant
    const AccessGrant = createAccessGrantModel();
    const result = await AccessGrant.findOneAndDelete({
      patientId: patient._id,
      doctorId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No access grant found for this doctor'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Access revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get all access grants for the patient
exports.getMyAccessGrants = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    // Find all access grants
    const AccessGrant = createAccessGrantModel();
    const grants = await AccessGrant.find({
      patientId: patient._id
    })
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode'
    });

    res.status(200).json({
      success: true,
      count: grants.length,
      data: grants
    });
  } catch (error) {
    console.error('Error getting access grants:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get pending access requests for the patient
exports.getAccessRequests = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find access requests
    const AccessRequest = require('../models/AccessRequest');
    const requests = await AccessRequest.find({
      patientId: patient._id
    })
    .sort({ requestedAt: -1 })
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode contactNo',
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

// Respond to a doctor's access request
exports.respondToAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, responseMessage } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }
    
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Find the request
    const AccessRequest = require('../models/AccessRequest');
    const request = await AccessRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Access request not found'
      });
    }
    
    // Verify the request belongs to this patient
    if (request.patientId.toString() !== patient._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this request'
      });
    }
    
    // Update request status
    request.status = status;
    request.responseMessage = responseMessage || '';
    request.responseDate = Date.now();
    await request.save();
    
    // If approved, create an access grant
    if (status === 'approved') {
      const AccessGrant = createAccessGrantModel();
      
      // Check if there's an existing grant
      let grant = await AccessGrant.findOne({
        patientId: patient._id,
        doctorId: request.doctorId
      });
      
      // Create or update the grant
      if (grant) {
        // Update existing grant
        grant.accessLevel = request.accessLevel;
        // Reset expiration to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        grant.expiresAt = expiresAt;
        grant.isActive = true;
        await grant.save();
      } else {
        // Create new grant
        await AccessGrant.create({
          patientId: patient._id,
          doctorId: request.doctorId,
          accessLevel: request.accessLevel,
          // Default expiry is 30 days from now
          grantedAt: Date.now()
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Request ${status}`,
      data: request
    });
  } catch (error) {
    console.error('Error responding to access request:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Generate a new access code for the patient
exports.generateNewAccessCode = async (req, res) => {
  try {
    // Get patient details from user ID
    const patient = await Patient.findOne({ userId: req.user.id });
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }
    
    // Generate new access code
    const crypto = require('crypto');
    const newAccessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Update patient record
    patient.accessCode = newAccessCode;
    await patient.save();
    
    res.status(200).json({
      success: true,
      message: 'Access code regenerated successfully',
      data: {
        accessCode: newAccessCode
      }
    });
  } catch (error) {
    console.error('Error generating new access code:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 