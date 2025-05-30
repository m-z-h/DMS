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
const Receptionist = require('../models/Receptionist');

// Helper function to generate access code
const generateAccessCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

// Helper function to generate JWT token with better error handling
const generateToken = (userId, role, hospitalCode, departmentCode) => {
  try {
    // Ensure we have a JWT secret
    const secret = process.env.JWT_SECRET || 'healthcareDMSSecretKey2024';
    
    // Sanitize inputs to prevent token generation errors
    const payload = {
      id: userId ? userId.toString() : '',
      role: role || 'Guest',
      hospitalCode: hospitalCode || '',
      departmentCode: departmentCode || ''
    };
    
    // Use a reasonable expiration time
    const expiry = process.env.JWT_EXPIRE || '30d';
    
    return jwt.sign(
      payload,
      secret,
      { expiresIn: expiry }
    );
  } catch (err) {
    console.error('Error generating token:', err);
    // Use a fallback approach instead of throwing
    const fallbackSecret = 'healthcareDMSSecretKey2024';
    const fallbackPayload = { id: userId ? userId.toString() : '', role: role || 'Guest' };
    
    return jwt.sign(
      fallbackPayload,
      fallbackSecret,
      { expiresIn: '1d' }
    );
  }
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

/**
 * Register a new doctor or receptionist
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, role, hospitalCode, departmentCode, fullName, contactNo, licenseNo, specialization, employeeId } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role || !hospitalCode || !fullName || !contactNo) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if role is valid (only doctor and receptionist can self-register)
    if (role !== 'Doctor' && role !== 'Receptionist') {
      return res.status(403).json({
        success: false,
        message: 'Self-registration is only allowed for doctors and receptionists'
      });
    }

    // Check if hospital exists
    const hospital = await Hospital.findOne({ code: hospitalCode, isActive: true });
    if (!hospital) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital code'
      });
    }

    // For doctors, validate department
    if (role === 'Doctor' && !departmentCode) {
      return res.status(400).json({
        success: false,
        message: 'Department code is required for doctors'
      });
    }

    if (role === 'Doctor') {
      const department = await Department.findOne({ 
        code: departmentCode, 
        hospitalCode, 
        isActive: true 
      });
      
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department code for this hospital'
        });
      }

      if (!licenseNo) {
        return res.status(400).json({
          success: false,
          message: 'License number is required for doctors'
        });
      }
    }

    // Employee ID is now optional for receptionists

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const newUser = new User({
      username,
      email,
      password,
      role,
      hospitalCode,
      departmentCode: role === 'Doctor' ? departmentCode : undefined,
      active: false // Users start as inactive until approved
    });

    await newUser.save();

    // Create profile based on role
    if (role === 'Doctor') {
      const newDoctor = new Doctor({
        userId: newUser._id,
        fullName,
        hospitalCode,
        departmentCode,
        contactNo,
        licenseNo,
        specialization: specialization || ''
      });

      await newDoctor.save();
    } else if (role === 'Receptionist') {
      const newReceptionist = new Receptionist({
        userId: newUser._id,
        fullName,
        hospitalCode,
        contactNo,
        employeeId: employeeId || undefined // Make employeeId optional
      });

      await newReceptionist.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Account pending approval by administrator.',
      data: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        id: newUser._id
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

/**
 * Login for all users (doctors, receptionists, patients)
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    console.log('[DEBUG] Login function called');
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('[DEBUG] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log(`[DEBUG] Looking up user with email: ${email}`);
    
    // Find user - add error handling for DB connection issues
    let user;
    try {
      user = await User.findOne({ email });
    } catch (dbError) {
      console.error('[DEBUG] Database error when finding user:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error when finding user',
        error: process.env.NODE_ENV === 'production' ? 'Database error' : dbError.message
      });
    }
    
    if (!user) {
      console.log('[DEBUG] User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.active) {
      console.log('[DEBUG] User account is not active');
      return res.status(403).json({
        success: false,
        message: 'Account is pending approval or has been deactivated'
      });
    }

    console.log('[DEBUG] Verifying password');
    
    // Verify password - with better error handling
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
    } catch (passwordError) {
      console.error('[DEBUG] Password comparison error:', passwordError);
      return res.status(500).json({
        success: false,
        message: 'Error during password verification',
        error: process.env.NODE_ENV === 'production' ? 'Authentication error' : passwordError.message
      });
    }
    
    if (!isMatch) {
      console.log('[DEBUG] Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('[DEBUG] Password verified, getting profile data');
    
    // Get user profile information based on role
    let profileData = {};
    
    try {
      if (user.role === 'Doctor') {
        const doctor = await Doctor.findOne({ userId: user._id });
        if (!doctor) {
          console.log('[DEBUG] Doctor profile not found');
          return res.status(404).json({
            success: false,
            message: 'Doctor profile not found'
          });
        }
        
        profileData = {
          fullName: doctor.fullName,
          hospitalCode: doctor.hospitalCode,
          departmentCode: doctor.departmentCode,
          contactNo: doctor.contactNo,
          licenseNo: doctor.licenseNo,
          specialization: doctor.specialization
        };
      } else if (user.role === 'Receptionist') {
        const receptionist = await Receptionist.findOne({ userId: user._id });
        if (!receptionist) {
          console.log('[DEBUG] Receptionist profile not found');
          return res.status(404).json({
            success: false,
            message: 'Receptionist profile not found'
          });
        }
        
        profileData = {
          fullName: receptionist.fullName,
          hospitalCode: receptionist.hospitalCode,
          contactNo: receptionist.contactNo,
          employeeId: receptionist.employeeId
        };
      } else if (user.role === 'Patient') {
        const patient = await Patient.findOne({ userId: user._id });
        if (!patient) {
          console.log('[DEBUG] Patient profile not found');
          return res.status(404).json({
            success: false,
            message: 'Patient profile not found'
          });
        }
        
        profileData = {
          fullName: patient.fullName,
          accessCode: patient.accessCode,
          contactNo: patient.contactNo
        };
      }
    } catch (profileError) {
      console.error('[DEBUG] Error getting profile data:', profileError);
      // Continue without profile data rather than failing the login
      profileData = { error: 'Could not retrieve complete profile data' };
    }

    console.log('[DEBUG] Generating token');
    
    // Generate JWT token with role and other important information
    let token;
    try {
      token = generateToken(
        user._id, 
        user.role, 
        user.hospitalCode || profileData.hospitalCode, 
        user.departmentCode || profileData.departmentCode
      );
    } catch (tokenError) {
      console.error('[DEBUG] Token generation error:', tokenError);
      return res.status(500).json({
        success: false,
        message: 'Error generating authentication token',
        error: process.env.NODE_ENV === 'production' ? 'Authentication error' : tokenError.message
      });
    }

    console.log('[DEBUG] Login successful, returning response');
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        ...profileData
      }
    });
  } catch (error) {
    console.error('[DEBUG] Unhandled login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get profile data based on role
    let profileData = {};
    
    if (user.role === 'Doctor') {
      const doctor = await Doctor.findOne({ userId: user._id });
      if (doctor) {
        profileData = {
          fullName: doctor.fullName,
          hospitalCode: doctor.hospitalCode,
          departmentCode: doctor.departmentCode,
          contactNo: doctor.contactNo,
          specialization: doctor.specialization
        };
      }
    } else if (user.role === 'Receptionist') {
      const receptionist = await Receptionist.findOne({ userId: user._id });
      if (receptionist) {
        profileData = {
          fullName: receptionist.fullName,
          hospitalCode: receptionist.hospitalCode,
          contactNo: receptionist.contactNo,
          employeeId: receptionist.employeeId
        };
      }
    } else if (user.role === 'Patient') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) {
        profileData = {
          fullName: patient.fullName,
          accessCode: patient.accessCode,
          contactNo: patient.contactNo
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        ...profileData
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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