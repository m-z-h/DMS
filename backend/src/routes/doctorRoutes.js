const express = require('express');
const { 
  getMyPatients,
  getPatientRecords,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMyAppointments,
  createAppointment,
  updateAppointmentStatus,
  accessCrossHospitalData,
  requestPatientAccess,
  getMyAccessRequests
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply protection middleware to all routes
// Only allow doctors to access these routes
router.use(protect);
router.use(authorize('Doctor'));

// Patient routes
router.get('/patients', getMyPatients);
router.get('/patients/:patientId/records', getPatientRecords);

// Medical record routes
router.post('/records', createMedicalRecord);
router.put('/records/:id', updateMedicalRecord);
router.delete('/records/:id', deleteMedicalRecord);

// Appointment routes
router.get('/appointments', getMyAppointments);
router.post('/appointments', createAppointment);
router.put('/appointments/:id/status', updateAppointmentStatus);

// Cross-hospital data access
router.post('/access-cross-hospital', accessCrossHospitalData);

// Patient access request routes
router.post('/patients/request-access', requestPatientAccess);
router.get('/access-requests', getMyAccessRequests);

module.exports = router; 