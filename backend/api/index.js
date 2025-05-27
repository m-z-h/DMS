const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config();

// Define fallback environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'healthcareDMSSecretKey2024';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
process.env.JWT_COOKIE_EXPIRE = process.env.JWT_COOKIE_EXPIRE || 30;

// Route files
const authRoutes = require('../src/routes/authRoutes');
const fileRoutes = require('../src/routes/fileRoutes');
const doctorRoutes = require('../src/routes/doctorRoutes');
const patientRoutes = require('../src/routes/patientRoutes');
const adminRoutes = require('../src/routes/adminRoutes');
const pdfRoutes = require('../src/routes/pdfRoutes');
const receptionistRoutes = require('../src/routes/receptionistRoutes');

// Middleware
const { logActivity } = require('../src/middleware/audit');

// Add global error handlers for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  // Keep the process running despite uncaught exceptions in Vercel environment
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  console.error('Stack:', err.stack);
  // Keep the process running despite unhandled rejections in Vercel environment
});

// Initialize app
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Enable CORS - properly configured for credentials
app.use(
  cors({
    origin: ['http://localhost:5173', process.env.CLIENT_URL || 'http://localhost:5173', 'https://dms-hqos.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Try to create uploads directory if it doesn't exist (may not work in Vercel)
try {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  }
  
  // Serve static files from the uploads directory
  app.use('/uploads', (req, res, next) => {
    console.log('Requested upload file:', req.url);
    next();
  }, express.static(uploadsDir));
} catch (err) {
  console.error('Error with uploads directory:', err.message);
}

// Add a route to list all files in the uploads directory
app.get('/api/uploads/list', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error reading uploads directory',
        error: err.message
      });
    }
    
    res.status(200).json({
      success: true,
      files: files
    });
  });
});

// Mount routers - Auth routes should be mounted before the audit middleware
// Add debug logging middleware before the auth routes
app.use('/api/auth', (req, res, next) => {
  console.log(`[DEBUG] Auth route hit: ${req.method} ${req.url}`);
  
  // For login route, add specific debugging
  if (req.method === 'POST' && req.url === '/login') {
    console.log('[DEBUG] Login attempt:', req.body.email);
  }
  next();
}, authRoutes);

// Apply audit logging to routes after auth routes
app.use(logActivity);

// Mount other routers
app.use('/api/files', fileRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/receptionist', receptionistRoutes);

app.get('/', (req, res) => {
  res.send("Welcome to DMS API");
});

// Add a health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add a test route for upload directory
app.get('/api/test-uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error reading uploads directory',
        error: err.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Uploads directory accessible',
      files: files,
      uploadsPath: uploadsDir
    });
  });
});

// Connect to MongoDB - with fallback options
const connectDB = async () => {
  try {
    // Try connecting with provided URI or local connection
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log(`Connecting to MongoDB at ${mongoUri.substring(0, mongoUri.indexOf('@') > 0 ? mongoUri.indexOf('@') : 15)}...`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increased timeout to 10s
      heartbeatFrequencyMS: 30000,     // Increase heartbeat frequency
      socketTimeoutMS: 45000,          // Increase socket timeout
      family: 4                        // Use IPv4, skip trying IPv6
    });
    
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Error details:', err);
    console.log('Continuing without database - some features will be limited');
  }
};

// Connect to database
connectDB();

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// Export the Express app for serverless use
module.exports = app; 