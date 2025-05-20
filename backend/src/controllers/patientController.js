const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const AccessGrant = require('../models/AccessGrant');
const AccessRequest = require('../models/AccessRequest');
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
    .limit(10)
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
    });

    // Ensure records have properly formatted vital signs for PDF generation
    const processedRecords = recentRecords.map(record => {
      const recordObj = record.toObject();
      
      // If the record has no vitalSigns or it's empty, try to use legacy vital field
      if (!recordObj.vitalSigns || Object.keys(recordObj.vitalSigns).length === 0) {
        return recordObj;
      }
      
      // Make sure nested objects like bloodPressure are properly handled
      if (recordObj.vitalSigns.bloodPressure) {
        // Ensure bloodPressure has systolic and diastolic properties
        if (typeof recordObj.vitalSigns.bloodPressure !== 'object') {
          recordObj.vitalSigns.bloodPressure = {
            systolic: null,
            diastolic: null
          };
        }
      }
      
      return recordObj;
    });

    // Find upcoming appointments
    const appointments = await Appointment.find({
      patientId: patient._id,
      date: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
    .sort({ date: 1, time: 1 })
    .limit(5)
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
      records: processedRecords,
      appointments: appointments,
      accessCode: patient.accessCode,
      generatedDate: new Date()
    });
    
    // Return PDF data
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${patient.fullName.replace(/\s+/g, '_')}_medical_report.pdf"`
    });
    
    // Send PDF directly to browser for download
    res.send(pdfBuffer);
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
    .sort({ date: 1, time: 1 }) // Sort by date ascending
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
    });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting patient appointments:', error);
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
    const { fullName, dateOfBirth, contactNo, address, profilePhoto } = req.body;

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
    if (profilePhoto !== undefined) patient.profilePhoto = profilePhoto;

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
      },
      isActive: {
        type: Boolean,
        default: true
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

    // Find and update the grant
    const grant = await AccessGrant.findOne({
      patientId: patient._id,
      doctorId
    });

    if (!grant) {
      return res.status(404).json({
        success: false,
        message: 'Access grant not found'
      });
    }

    // Instead of revoking completely, just downgrade to read-only access
    // This allows doctors to still see records they've previously created/accessed
    grant.accessLevel = 'read'; // Downgrade to read-only
    await grant.save();

    res.status(200).json({
      success: true,
      message: 'Access restricted to read-only successfully'
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

    // Find all active access grants including read-only ones (instead of just active=true)
    const grants = await AccessGrant.find({ 
      patientId: patient._id,
      isActive: true,
      expiresAt: { $gt: new Date() } // Not expired
    })
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode userId',
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

    // Find access requests for this patient
    const requests = await AccessRequest.find({ 
      patientId: patient._id
    })
    .sort({ requestedAt: -1 })
    .populate({
      path: 'doctorId',
      select: 'fullName hospitalCode departmentCode',
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

    // Generate a new 12-digit access code
    const generateCode = () => {
      return Math.floor(100000000000 + Math.random() * 900000000000).toString();
    };

    // Make sure the code is unique
    let accessCode;
    let isUnique = false;
    
    while (!isUnique) {
      accessCode = generateCode();
      const existingPatient = await Patient.findOne({ accessCode });
      if (!existingPatient) {
        isUnique = true;
      }
    }

    // Update patient with new code
    patient.accessCode = accessCode;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Access code regenerated successfully',
      data: {
        accessCode: patient.accessCode
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

// Get patient profile
exports.getProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id });
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Error getting patient profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get available doctors for scheduling appointments
exports.getDoctors = async (req, res) => {
  try {
    // Get all active doctors
    const doctors = await Doctor.find()
      .populate({
        path: 'userId',
        select: 'email active',
        match: { active: true } // Only include active user accounts
      })
      .select('fullName specialization hospitalCode departmentCode');
    
    // Filter out doctors whose user account is not active
    const activeDoctors = doctors.filter(doc => doc.userId);
    
    res.status(200).json({
      success: true,
      count: activeDoctors.length,
      data: activeDoctors
    });
  } catch (error) {
    console.error('Error getting doctors list:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
}; 