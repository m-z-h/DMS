import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const ReceptionistDashboard = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [newPatientId, setNewPatientId] = useState(null);

  // API base URL from environment variable or default
  const apiUrl = 'https://dms-o3zx.vercel.app/api';

  // Patient registration form
  const [patientForm, setPatientForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNo: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: '',
    address: '',
    emergencyContact: '',
    departmentCode: '',
    height: '',
    weight: '',
    aadhaarNumber: ''
  });

  // Appointment form
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
    reason: '',
    notes: ''
  });

  // Fetch receptionist profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await axios.get(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          setProfileData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data');
      }
    };

    if (token) {
      fetchProfileData();
    } 
  }, [token, apiUrl]);

  // Fetch patients, departments, doctors, and appointments for this hospital
  useEffect(() => {
    const fetchHospitalData = async () => {
      if (!profileData?.hospitalCode) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all data in parallel
        const [patientsRes, deptsRes, doctorsRes, apptsRes] = await Promise.all([
          // Fetch hospital patients
          axios.get(`${apiUrl}/receptionist/patients`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { hospitalCode: profileData.hospitalCode }
          }),
          
          // Fetch hospital departments
          axios.get(`${apiUrl}/auth/departments`, {
            params: { hospitalCode: profileData.hospitalCode }
          }),
          
          // Fetch hospital doctors
          axios.get(`${apiUrl}/receptionist/doctors`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { hospitalCode: profileData.hospitalCode }
          }),
          
          // Fetch today's appointments
          axios.get(`${apiUrl}/receptionist/appointments`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { 
              hospitalCode: profileData.hospitalCode,
              date: new Date().toISOString().split('T')[0]
            }
          })
        ]);
        
        if (patientsRes.data.success) {
          setPatients(patientsRes.data.data || []);
        }
        
        if (deptsRes.data.success) {
          setDepartments(deptsRes.data.data || []);
        }
        
        if (doctorsRes.data.success) {
          setDoctors(doctorsRes.data.data || []);
        }
        
        if (apptsRes.data.success) {
          setAppointments(apptsRes.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching hospital data:', err);
        setError('Failed to load hospital data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHospitalData();
  }, [profileData, token, apiUrl]);

  // Handle input change for patient form
  const handlePatientFormChange = (e) => {
    const { name, value } = e.target;
    setPatientForm({ ...patientForm, [name]: value });
  };

  // Handle input change for appointment form
  const handleAppointmentFormChange = (e) => {
    const { name, value } = e.target;
    setAppointmentForm({ ...appointmentForm, [name]: value });
  };

  // Register a new patient
  const handlePatientRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Validate form data
      if (!patientForm.firstName || !patientForm.lastName || !patientForm.contactNo || 
          !patientForm.dateOfBirth || !patientForm.gender || !patientForm.departmentCode) {
        setError('Please fill all required fields');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiUrl}/receptionist/register-patient`,
        {
          ...patientForm,
          hospitalCode: profileData.hospitalCode
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccessMessage('Patient registered successfully!');
        
        // Store new patient ID for PDF download popup
        setNewPatientId(response.data.data._id);
        setShowPdfPopup(true);
        
        // Reset form
        setPatientForm({
          firstName: '',
          lastName: '',
          email: '',
          contactNo: '',
          dateOfBirth: '',
          gender: 'Male',
          bloodGroup: '',
          address: '',
          emergencyContact: '',
          departmentCode: '',
          height: '',
          weight: '',
          aadhaarNumber: ''
        });
        
        // Refresh patients list
        const patientsRes = await axios.get(`${apiUrl}/receptionist/patients`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { hospitalCode: profileData.hospitalCode }
        });
        
        if (patientsRes.data.success) {
          setPatients(patientsRes.data.data || []);
        }
      } else {
        setError(response.data.message || 'Failed to register patient');
      }
    } catch (err) {
      console.error('Error registering patient:', err);
      setError(err.response?.data?.message || 'An error occurred during patient registration');
    } finally {
      setLoading(false);
    }
  };

  // Schedule a new appointment
  const handleAppointmentScheduling = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Validate form data
      if (!appointmentForm.patientId || !appointmentForm.doctorId || 
          !appointmentForm.date || !appointmentForm.time) {
        setError('Please fill all required fields');
        setLoading(false);
        return;
      }
      
      const response = await axios.post(
        `${apiUrl}/receptionist/schedule-appointment`,
        {
          ...appointmentForm,
          hospitalCode: profileData.hospitalCode
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccessMessage('Appointment scheduled successfully!');
        // Reset form
        setAppointmentForm({
          patientId: '',
          doctorId: '',
          date: '',
          time: '',
          reason: '',
          notes: ''
        });
        
        // Refresh appointments list
        const apptsRes = await axios.get(`${apiUrl}/receptionist/appointments`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            hospitalCode: profileData.hospitalCode,
            date: appointmentForm.date
          }
        });
        
        if (apptsRes.data.success) {
          setAppointments(apptsRes.data.data || []);
        }
      } else {
        setError(response.data.message || 'Failed to schedule appointment');
      }
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      setError(err.response?.data?.message || 'An error occurred during appointment scheduling');
    } finally {
      setLoading(false);
    }
  };

  // Download patient credentials PDF
  const downloadPatientPDF = async (patientId) => {
    try {
      const response = await axios.get(`${apiUrl}/receptionist/patient-pdf/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patient_credentials_${patientId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Close the popup if it was opened
      if (showPdfPopup) {
        setShowPdfPopup(false);
        setNewPatientId(null);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download patient credentials PDF');
    }
  };

  // Show loading spinner if data is still loading
  if (loading && !profileData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-3 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Receptionist Dashboard</h1>
      
      {/* PDF Download Popup */}
      {showPdfPopup && newPatientId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Patient Registration Successful</h3>
            <p className="mb-4">Patient has been successfully registered. You can download the patient's credentials now.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPdfPopup(false);
                  setNewPatientId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => downloadPatientPDF(newPatientId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Download Credentials
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dashboard Header Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Welcome, {profileData?.fullName || 'Receptionist'}</h2>
            <p className="text-gray-600">Hospital: <span className="font-medium">{profileData?.hospitalCode || 'Unknown'}</span></p>
            <p className="text-gray-600">Employee ID: <span className="font-medium">{profileData?.employeeId || 'Not assigned'}</span></p>
          </div>
          
          <div className="mt-4 md:mt-0 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{patients.length}</div>
              <div className="text-sm text-blue-600">Registered Patients</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{appointments.length}</div>
              <div className="text-sm text-green-600">Today's Appointments</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dashboard Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            className={`py-3 border-b-2 font-medium ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-3 border-b-2 font-medium ${
              activeTab === 'register-patient'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('register-patient')}
          >
            Register Patient
          </button>
          <button
            className={`py-3 border-b-2 font-medium ${
              activeTab === 'schedule-appointment'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('schedule-appointment')}
          >
            Schedule Appointment
          </button>
          <button
            className={`py-3 border-b-2 font-medium ${
              activeTab === 'manage-patients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300 text-gray-600 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('manage-patients')}
          >
            Manage Patients
          </button>
        </nav>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
              <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
              <button 
                onClick={() => setActiveTab('register-patient')}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                Register New Patient
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
              <p className="text-3xl font-bold text-gray-800">{appointments.length}</p>
              <button 
                onClick={() => setActiveTab('schedule-appointment')}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                Schedule Appointment
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium">Departments</h3>
              <p className="text-3xl font-bold text-gray-800">{departments.length}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-500 text-sm font-medium">Active Doctors</h3>
              <p className="text-3xl font-bold text-gray-800">{doctors.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Today's Appointments</h2>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Patient</th>
                        <th scope="col" className="px-6 py-3">Doctor</th>
                        <th scope="col" className="px-6 py-3">Time</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {appointments.map((appointment) => (
                        <tr key={appointment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{appointment.patientName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{appointment.doctorName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{appointment.time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {appointment.status || 'Scheduled'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 py-4">No appointments scheduled for today.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Recently Registered Patients</h2>
              {patients.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Name</th>
                        <th scope="col" className="px-6 py-3">Contact</th>
                        <th scope="col" className="px-6 py-3">Department</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {patients.slice(0, 5).map((patient) => (
                        <tr key={patient._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{patient.fullName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{patient.contactNo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-gray-900">{patient.departmentName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => downloadPatientPDF(patient._id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 py-4">No patients registered yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Patient Tab */}
      {activeTab === 'register-patient' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="border-b border-gray-200 pb-4 mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Register New Patient</h2>
            <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium">
              Total Patients: {patients.length}
            </span>
          </div>
          <form onSubmit={handlePatientRegistration}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={patientForm.firstName}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={patientForm.lastName}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={patientForm.email}
                  onChange={handlePatientFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contactNo"
                  value={patientForm.contactNo}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={patientForm.dateOfBirth}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={patientForm.gender}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={patientForm.bloodGroup}
                  onChange={handlePatientFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  name="departmentCode"
                  value={patientForm.departmentCode}
                  onChange={handlePatientFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={patientForm.address}
                  onChange={handlePatientFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  name="emergencyContact"
                  value={patientForm.emergencyContact}
                  onChange={handlePatientFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Registering...' : 'Register Patient'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule Appointment Tab */}
      {activeTab === 'schedule-appointment' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Schedule New Appointment</h2>
          <form onSubmit={handleAppointmentScheduling}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient *
                </label>
                <select
                  name="patientId"
                  value={appointmentForm.patientId}
                  onChange={handleAppointmentFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor *
                </label>
                <select
                  name="doctorId"
                  value={appointmentForm.doctorId}
                  onChange={handleAppointmentFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.fullName} ({doctor.departmentName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={appointmentForm.date}
                  onChange={handleAppointmentFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time *
                </label>
                <input
                  type="time"
                  name="time"
                  value={appointmentForm.time}
                  onChange={handleAppointmentFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Visit
                </label>
                <textarea
                  name="reason"
                  value={appointmentForm.reason}
                  onChange={handleAppointmentFormChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={appointmentForm.notes}
                  onChange={handleAppointmentFormChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manage Patients Tab */}
      {activeTab === 'manage-patients' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Manage Patients</h2>
          
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Contact</th>
                    <th scope="col" className="px-6 py-3">Department</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{patient.fullName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{patient.contactNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{patient.departmentName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{patient.email || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <p>No patients found in this hospital.</p>
              <button
                onClick={() => setActiveTab('register-patient')}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Register New Patient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceptionistDashboard; 