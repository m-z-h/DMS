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
const authRoutes = require('./src/routes/authRoutes');
const fileRoutes = require('./src/routes/fileRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const pdfRoutes = require('./src/routes/pdfRoutes');
const receptionistRoutes = require('./src/routes/receptionistRoutes');

// Middleware
const { logActivity } = require('./src/middleware/audit');

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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Serve static files from the uploads directory
app.use('/uploads', (req, res, next) => {
  console.log('Requested upload file:', req.url);
  next();
}, express.static(uploadsDir));

// Add a route to list all files in the uploads directory
app.get('/api/uploads/list', (req, res) => {
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
// since the audit middleware expects req.user to be set
app.use('/api/auth', authRoutes);

// Apply audit logging to routes after auth routes (so auth routes don't get logged)
// The protect middleware in other routes will set req.user before audit logging happens
app.use(logActivity);

// Mount other routers
app.use('/api/files', fileRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/receptionist', receptionistRoutes);

app.get('/', (req, res) => {
  res.send("welcome");
});
// Add a health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add a test route for upload directory
app.get('/api/test-uploads', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
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

// Serve static folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// Connect to MongoDB - with fallback options
const connectDB = async () => {
  try {
    // Try connecting with provided URI or local connection
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://mzh:mzh2580@cluster0.nl0a7aj.mongodb.net/DMS?retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    
    // Start the server when not in serverless environment
    if (process.env.NODE_ENV !== 'vercel') {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      });
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Continuing without database - some features will be limited');
    
    // Start server when not in serverless environment
    if (process.env.NODE_ENV !== 'vercel') {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT} (WITHOUT DATABASE)`);
      });
    }
  }
};

// Connect to database
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  // server.close(() => process.exit(1));
});

// Export the Express app for serverless use
module.exports = app; 