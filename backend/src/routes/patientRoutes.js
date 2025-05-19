const express = require('express');
const { 
  getMyRecords,
  getMyAppointments,
  requestAppointment,
  updatePersonalInfo,
  downloadMedicalReport,
  grantDoctorAccess,
  revokeDoctorAccess,
  getMyAccessGrants,
  getAccessRequests,
  respondToAccessRequest,
  generateNewAccessCode
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection middleware to all routes
// Only allow patients to access these routes
router.use(protect);
router.use(authorize('Patient'));

// Medical record routes
router.get('/records', getMyRecords);
router.get('/records/download', downloadMedicalReport);

// Appointment routes
router.get('/appointments', getMyAppointments);
router.post('/appointments/request', requestAppointment);

// Profile management
router.put('/profile', updatePersonalInfo);

// Access management
router.post('/access/grant', grantDoctorAccess);
router.delete('/access/revoke/:doctorId', revokeDoctorAccess);
router.get('/access/grants', getMyAccessGrants);

// Access request management
router.get('/access/requests', getAccessRequests);
router.put('/access/requests/:requestId', respondToAccessRequest);
router.post('/access/regenerate-code', generateNewAccessCode);

module.exports = router; 