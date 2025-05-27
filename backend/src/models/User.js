const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['Admin', 'Doctor', 'Patient', 'Receptionist'],
    required: true
  },
  hospitalCode: {
    type: String,
    required: function() { return this.role === 'Doctor' || this.role === 'Receptionist'; }
  },
  departmentCode: {
    type: String,
    required: function() { return this.role === 'Doctor'; }
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving - with try/catch and better error handling
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Method to compare password - with try/catch and better error handling
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Make sure passwords exist
    if (!candidatePassword || !this.password) {
      console.error('Missing password for comparison');
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false; // Return false instead of throwing an error
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User; 