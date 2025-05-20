const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generatePDF } = require('../utils/pdfGenerator');
const mongoose = require('mongoose');
const Department = require('../models/Department');

// Helper function to generate access code
const generateAccessCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

// Check if admin exists
exports.checkAdminExists = async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'Admin' });
    return res.status(200).json({
      success: true,
      exists: !!admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Register user - Admin, Doctor, Patient
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, fullName, hospitalCode, departmentCode, 
            dateOfBirth, contactNo, address, licenseNo } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or Email already in use' 
      });
    }

    // Special handling for Admin registration - allow only one admin
    if (role === 'Admin') {
      const adminExists = await User.findOne({ role: 'Admin' });
      if (adminExists) {
        return res.status(403).json({
          success: false,
          message: 'Admin account already exists. Only one admin is allowed in the system.'
        });
      }
    }

    // For doctors, validate email domain against hospital domains
    if (role === 'Doctor') {
      // Verify required doctor fields
      if (!hospitalCode || !departmentCode || !licenseNo || !contactNo) {
        return res.status(400).json({
          success: false,
          message: 'Missing required doctor information'
        });
      }

      // Get hospital by code to verify email domain
      const hospital = await Hospital.findOne({ code: hospitalCode });
      if (!hospital) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hospital code'
        });
      }

      // Extract email domain and verify against hospital domain
      const emailDomain = email.split('@')[1];
      if (!emailDomain || emailDomain.toLowerCase() !== hospital.emailDomain.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: `Doctor registration requires an email with the hospital's domain: ${hospital.emailDomain}`
        });
      }
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role,
      hospitalCode: role === 'Doctor' ? hospitalCode : undefined,
      departmentCode: role === 'Doctor' ? departmentCode : undefined
    });

    // Create role-specific profile
    if (role === 'Doctor') {
      await Doctor.create({
        userId: user._id,
        fullName,
        hospitalCode,
        departmentCode,
        contactNo,
        licenseNo
      });
    } else if (role === 'Patient') {
      // Generate access code for patient
      const accessCode = generateAccessCode();
      
      await Patient.create({
        userId: user._id,
        fullName,
        dateOfBirth,
        contactNo,
        address,
        accessCode
      });
      
      // Generate PDF with patient credentials
      const pdfBuffer = await generatePDF({
        patientName: fullName,
        patientId: user._id,
        username,
        password, // This is the plaintext password before hashing
        accessCode
      });
      
      // Return both token and PDF data
      return sendTokenResponse(user, 201, res, { 
        pdfData: pdfBuffer.toString('base64'),
        accessCode 
      });
    }

    // Send token response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please try again later.'
      });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get additional profile info if needed
    let additionalData = {};
    if (user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) {
        additionalData.accessCode = patient.accessCode;
      }
    }

    sendTokenResponse(user, 200, res, additionalData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get current logged in user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let profile = null;
    if (user.role === 'Doctor') {
      profile = await Doctor.findOne({ userId: user._id });
    } else if (user.role === 'Patient') {
      profile = await Patient.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get hospitals (public endpoint for registration)
exports.getHospitals = async (req, res) => {
  try {
    console.log('Getting hospitals for registration');
    const hospitals = await Hospital.find({ isActive: true }).select('name code emailDomain').sort({ name: 1 });
    
    console.log(`Found ${hospitals.length} hospitals`);
    
    if (hospitals.length === 0) {
      // No hospitals found, provide default data
      const defaultHospitals = [
        { 
          _id: 'default1', 
          name: 'Manipal Hospital', 
          code: 'MH1',
          emailDomain: 'manipal.com',
          isActive: true 
        },
        { 
          _id: 'default2', 
          name: 'Apollo Hospital', 
          code: 'AH2',
          emailDomain: 'apollo.com',
          isActive: true 
        },
        { 
          _id: 'default3', 
          name: 'Fortis Hospital', 
          code: 'FH3',
          emailDomain: 'fortis.com',
          isActive: true 
        }
      ];
      
      return res.status(200).json({
        success: true,
        count: defaultHospitals.length,
        data: defaultHospitals,
        message: 'Using default hospital data'
      });
    }
    
    res.status(200).json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    console.error('Error getting hospitals:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Get departments (public endpoint for registration)
exports.getDepartments = async (req, res) => {
  try {
    console.log('Getting departments for registration');
    
    // Check if filtering by hospital code
    const { hospitalCode } = req.query;
    
    let query = { isActive: true };
    if (hospitalCode) {
      console.log(`Filtering departments by hospital code: ${hospitalCode}`);
      query.hospitalCode = hospitalCode;
    }
    
    const departments = await Department.find(query).select('name code hospitalCode').sort({ name: 1 });
    
    console.log(`Found ${departments.length} departments${hospitalCode ? ' for hospital ' + hospitalCode : ''}`);
    
    if (departments.length === 0 && hospitalCode) {
      // If no departments found for this hospital, return a helpful message
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: `No departments found for hospital code ${hospitalCode}`
      });
    }
    
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, additionalData = {}) => {
  // Create token
  const token = jwt.sign(
    { 
      id: user._id,
      role: user.role,
      hospitalCode: user.hospitalCode,
      departmentCode: user.departmentCode
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Secure cookie in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      role: user.role,
      ...additionalData
    });
}; 