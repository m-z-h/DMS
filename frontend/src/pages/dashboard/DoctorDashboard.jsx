import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add doctor profile state
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [profileUpdateForm, setProfileUpdateForm] = useState({
    fullName: '',
    specialization: '',
    contactNo: '',
    hospitalCode: '',
    departmentCode: '',
    profilePhoto: null
  });
  
  // Add state for profile photo
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  
  // Add state for cross-hospital accessed patient
  const [accessedPatient, setAccessedPatient] = useState(null);
  
  // Form states
  const [newRecord, setNewRecord] = useState({
    diagnosis: '',
    prescription: '',
    recordType: 'general',
    notes: '',
    vitalSigns: {
      temperature: '',
      bloodPressure: {
        systolic: '',
        diastolic: ''
      },
      heartRate: '',
      respiratoryRate: '',
      weight: '',
      height: '',
      oxygenSaturation: ''
    },
    shouldEncrypt: false
  });
  
  const [newAppointment, setNewAppointment] = useState({
    patientId: '',
    date: '',
    time: '',
    duration: 30,
    reason: '',
    notes: ''
  });
  
  const [crossHospitalAccess, setCrossHospitalAccess] = useState({
    patientId: '',
    accessCode: ''
  });
  
  const [crossHospitalRecords, setCrossHospitalRecords] = useState([]);
  
  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch patients
        const patientsRes = await axios.get(`${apiUrl}/doctor/patients`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch appointments
        const appointmentsRes = await axios.get(`${apiUrl}/doctor/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Fetch doctor profile
        const profileRes = await axios.get(`${apiUrl}/doctor/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setPatients(patientsRes.data.data || []);
        setAppointments(appointmentsRes.data.data || []);
        
        // Set doctor profile and update form
        if (profileRes.data.success && profileRes.data.data) {
          const profile = profileRes.data.data;
          setDoctorProfile(profile);
          
          // Initialize the update form with current values
          setProfileUpdateForm({
            fullName: profile.fullName || '',
            specialization: profile.specialization || '',
            contactNo: profile.contactNo || '',
            hospitalCode: profile.hospitalCode || user?.hospitalCode || '',
            departmentCode: profile.departmentCode || user?.departmentCode || '',
            profilePhoto: profile.profilePhoto || null
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [apiUrl, user?.hospitalCode, user?.departmentCode]);
  
  const fetchPatientRecords = async (patientId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${apiUrl}/doctor/patients/${patientId}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPatientRecords(res.data.data || []);
    } catch (err) {
      console.error('Error fetching patient records:', err);
      setError('Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    fetchPatientRecords(patient._id);
  };
  
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      // Create a deep copy to avoid modifying the state directly
      const recordData = JSON.parse(JSON.stringify(newRecord));
      
      // Format vitalSigns data - remove any empty string values
      if (recordData.vitalSigns) {
        Object.keys(recordData.vitalSigns).forEach(key => {
          // Handle nested bloodPressure object
          if (key === 'bloodPressure') {
            if (recordData.vitalSigns.bloodPressure) {
              // Convert empty strings to null in bloodPressure
              Object.keys(recordData.vitalSigns.bloodPressure).forEach(bpKey => {
                if (recordData.vitalSigns.bloodPressure[bpKey] === '') {
                  recordData.vitalSigns.bloodPressure[bpKey] = null;
                }
              });
            }
          } else if (recordData.vitalSigns[key] === '') {
            // Convert other empty strings to null
            recordData.vitalSigns[key] = null;
          }
        });
      }
      
      // Convert string numbers to actual numbers
      ['temperature', 'heartRate', 'respiratoryRate', 'weight', 'height', 'oxygenSaturation'].forEach(field => {
        if (recordData.vitalSigns[field]) {
          recordData.vitalSigns[field] = Number(recordData.vitalSigns[field]);
        }
      });
      
      if (recordData.vitalSigns.bloodPressure) {
        ['systolic', 'diastolic'].forEach(field => {
          if (recordData.vitalSigns.bloodPressure[field]) {
            recordData.vitalSigns.bloodPressure[field] = Number(recordData.vitalSigns.bloodPressure[field]);
          }
        });
      }
      
      await axios.post(
        `${apiUrl}/doctor/records`, 
        {
          ...recordData,
          patientId: selectedPatient._id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh patient records
      fetchPatientRecords(selectedPatient._id);
      
      // Reset form
      setNewRecord({
        diagnosis: '',
        prescription: '',
        recordType: 'general',
        notes: '',
        vitalSigns: {
          temperature: '',
          bloodPressure: {
            systolic: '',
            diastolic: ''
          },
          heartRate: '',
          respiratoryRate: '',
          weight: '',
          height: '',
          oxygenSaturation: ''
        },
        shouldEncrypt: false
      });
      
      alert('Medical record created successfully');
    } catch (err) {
      console.error('Error creating record:', err);
      alert(`Failed to create medical record: ${err.response?.data?.message || err.message}`);
    }
  };
  
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${apiUrl}/doctor/appointments`, 
        newAppointment,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh appointments
      const appointmentsRes = await axios.get(
        `${apiUrl}/doctor/appointments`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setAppointments(appointmentsRes.data.data || []);
      
      // Reset form
      setNewAppointment({
        patientId: '',
        date: '',
        time: '',
        duration: 30,
        reason: '',
        notes: ''
      });
      
      alert('Appointment scheduled successfully');
    } catch (err) {
      console.error('Error creating appointment:', err);
      alert('Failed to schedule appointment');
    }
  };
  
  const handleUpdateAppointment = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${apiUrl}/doctor/appointments/${id}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update local state
      setAppointments(appointments.map(appointment =>
        appointment._id === id
          ? { ...appointment, status }
          : appointment
      ));
      
      alert('Appointment status updated successfully');
    } catch (err) {
      console.error('Error updating appointment:', err);
      alert('Failed to update appointment');
    }
  };
  
  const handleAccessCrossHospitalData = async (e) => {
    e.preventDefault();
    
    try {
      // Clear previous errors and any previously accessed patient
      setError(null);
      
      // Check if we have patientId (required)
      const hasPatientId = crossHospitalAccess.patientId.trim() !== '';
      const hasAccessCode = crossHospitalAccess.accessCode.trim() !== '';
      
      // We need a patientId
      if (!hasPatientId) {
        setError('Patient ID is required');
        return;
      }
      
      // Prepare data for request - always include patientId
      const requestData = {
        patientId: crossHospitalAccess.patientId
      };
      
      // Add accessCode if provided
      if (hasAccessCode) {
        requestData.accessCode = crossHospitalAccess.accessCode;
      }

      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        `${apiUrl}/doctor/access-cross-hospital`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Handle different response types
      if (res.status === 202) {
        // Access request was created (not immediate access)
        setCrossHospitalRecords([]);
        setAccessedPatient(null);
        
        // Display success message to user
        alert(`Access request sent to ${res.data.patientDetails?.fullName || 'the patient'}. You'll be notified when access is granted.`);
        
        // Clear the form
        setCrossHospitalAccess({
          patientId: '',
          accessCode: ''
        });
      } else if (res.data.success) {
        // Direct access granted
        setCrossHospitalRecords(res.data.data || []);
        
        // Save patient details if provided in the response
        if (res.data.patientDetails) {
          // Store the accessed patient for future use
          setAccessedPatient(res.data.patientDetails);
        }
        
        // Clear form but show success message
        setCrossHospitalAccess({
          patientId: '',
          accessCode: ''
        });
        
        alert(`Access granted to patient records for ${res.data.patientDetails?.fullName || 'the patient'}.`);
      }
    } catch (err) {
      console.error('Error accessing data:', err);
      // Reset any partial data
      setCrossHospitalRecords([]);
      setAccessedPatient(null);
      
      // Show error message
      setError(err.response?.data?.message || 'Failed to access data. Please check the patient ID and access code.');
    }
  };
  
  const handleInputChange = (e, formSetter, form, nestedField = null) => {
    const { name, value } = e.target;
    
    if (nestedField) {
      // Handle double nested fields like vitalSigns.bloodPressure.systolic
      if (nestedField.includes('.')) {
        const [parentField, childField] = nestedField.split('.');
        formSetter({
          ...form,
          [parentField]: {
            ...form[parentField],
            [childField]: {
              ...form[parentField][childField],
              [name]: value
            }
          }
        });
      } else {
        formSetter({
          ...form,
          [nestedField]: {
            ...form[nestedField],
            [name]: value
          }
        });
      }
    } else {
      formSetter({
        ...form,
        [name]: value
      });
    }
  };
  
  // Add function to update doctor profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setLoading(true);
      
      const token = localStorage.getItem('token');
      let profilePhotoUrl = profileUpdateForm.profilePhoto;
      
      // If there's a new profile photo, upload it first
      if (profilePhotoFile) {
        try {
          const formData = new FormData();
          formData.append('file', profilePhotoFile);
          
          const uploadRes = await axios.post(
            `${apiUrl}/files/upload`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              }
            }
          );
          
          if (uploadRes.data.success) {
            profilePhotoUrl = uploadRes.data.file.filename;
          } else {
            throw new Error('File upload failed');
          }
        } catch (uploadErr) {
          console.error('Profile photo upload error:', uploadErr);
          alert('Failed to upload profile photo. Profile information will be updated without the new photo.');
        }
      }
      
      // Create updated profile data with possibly new photo URL
      const updatedProfile = {
        ...profileUpdateForm,
        profilePhoto: profilePhotoUrl
      };
      
      const res = await axios.put(
        `${apiUrl}/doctor/profile`,
        updatedProfile,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        setDoctorProfile(res.data.data);
        
        // Update the form with new data too
        setProfileUpdateForm(prev => ({
          ...prev,
          profilePhoto: profilePhotoUrl
        }));
        
        setProfilePhotoFile(null);
        alert('Profile updated successfully');
      } else {
        throw new Error(res.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Add function to handle profile photo change
  const handleProfilePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('Selected profile photo:', selectedFile.name, 'Size:', Math.round(selectedFile.size/1024), 'KB');
      
      setProfilePhotoFile(selectedFile);
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('Preview created for profile photo');
        setProfileUpdateForm(prev => ({
          ...prev,
          profilePhoto: event.target.result
        }));
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // Utility to construct proper image URLs
  const getImageUrl = (filename) => {
    if (!filename) return null;
    
    // If it's a data URL, keep as is
    if (filename.startsWith('data:')) return filename;
    
    // If it's already a full URL, keep as is
    if (filename.startsWith('http')) return filename;
    
    // Get API base URL from environment or default
    const baseUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') // Remove /api if present
      : window.location.origin; // Use origin as fallback
    
    // If it includes the full path like /uploads/filename, add domain
    if (filename.startsWith('/uploads/')) {
      return `${baseUrl}${filename}`;
    }
    
    // Otherwise assume it's just a filename that needs the full path
    return `${baseUrl}/uploads/${filename}`;
  };

  if (loading && !patients.length && !appointments.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Doctor Dashboard</h1>
      
      {/* Dashboard Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            className={`py-3 border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-3 border-b-2 ${
              activeTab === 'patients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('patients')}
          >
            Patients
          </button>
          <button
            className={`py-3 border-b-2 ${
              activeTab === 'appointments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button
            className={`py-3 border-b-2 ${
              activeTab === 'cross-hospital'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('cross-hospital')}
          >
            Cross-Hospital Access
          </button>
          <button
            className={`py-3 border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
        </nav>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
              <p className="text-3xl font-bold text-gray-700">{patients.length}</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
              <p className="text-3xl font-bold text-gray-700">
                {appointments.filter(apt => {
                  const today = new Date();
                  const aptDate = new Date(apt.date);
                  return aptDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">Upcoming Appointments</h3>
              <p className="text-3xl font-bold text-gray-700">
                {appointments.filter(apt => apt.status === 'Scheduled' || apt.status === 'Confirmed').length}
              </p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
            
            {appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3">Patient Name</th>
                      <th scope="col" className="px-6 py-3">Date</th>
                      <th scope="col" className="px-6 py-3">Time</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments
                      .filter(apt => apt.status === 'Scheduled' || apt.status === 'Confirmed')
                      .slice(0, 5)
                      .map(appointment => (
                        <tr key={appointment._id} className="bg-white border-b">
                          <td className="px-6 py-4">{appointment.patientId?.fullName || 'Unknown'}</td>
                          <td className="px-6 py-4">{new Date(appointment.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">{appointment.time}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              appointment.status === 'Confirmed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => handleUpdateAppointment(appointment._id, 'Confirmed')}
                              className="text-blue-600 hover:underline mr-3"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => handleUpdateAppointment(appointment._id, 'Cancelled')}
                              className="text-red-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4">No upcoming appointments.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Your Patients</h2>
            
            {patients.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {patients.map(patient => (
                  <div 
                    key={patient._id}
                    className={`py-3 cursor-pointer hover:bg-gray-50 ${
                      selectedPatient && selectedPatient._id === patient._id ? 'bg-gray-50' : ''
                    }`}
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <p className="font-medium">{patient.fullName}</p>
                    <p className="text-sm text-gray-500">{patient.dateOfBirth ? `DOB: ${new Date(patient.dateOfBirth).toLocaleDateString()}` : ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No patients found.</p>
            )}
          </div>
          
          {/* Patient Records and Add Record Form */}
          <div className="col-span-1 lg:col-span-2">
            {selectedPatient ? (
              <div>
                {/* Patient Details */}
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                  <h2 className="text-lg font-semibold mb-2">Patient Details</h2>
                  <p className="mb-1"><span className="font-medium">Name:</span> {selectedPatient.fullName}</p>
                  <p className="mb-1">
                    <span className="font-medium">Date of Birth:</span> {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="mb-1"><span className="font-medium">Contact:</span> {selectedPatient.contactNo || 'N/A'}</p>
                  <p className="mb-1"><span className="font-medium">Email:</span> {selectedPatient.userId?.email || 'N/A'}</p>
                </div>
                
                {/* Add Medical Record Form */}
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                  <h2 className="text-lg font-semibold mb-4">Add Medical Record</h2>
                  
                  <form onSubmit={handleCreateRecord}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Record Type</label>
                        <select 
                          name="recordType"
                          value={newRecord.recordType}
                          onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                          className="w-full p-2 border border-gray-300 rounded"
                          required
                        >
                          <option value="general">General</option>
                          <option value="lab">Lab Results</option>
                          <option value="prescription">Prescription</option>
                          <option value="vitals">Vitals</option>
                          <option value="notes">Notes</option>
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Diagnosis</label>
                        <textarea
                          name="diagnosis"
                          value={newRecord.diagnosis}
                          onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                          className="w-full p-2 border border-gray-300 rounded"
                          required
                        ></textarea>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Prescription</label>
                        <textarea
                          name="prescription"
                          value={newRecord.prescription}
                          onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                          className="w-full p-2 border border-gray-300 rounded"
                        ></textarea>
                      </div>
                      
                      {newRecord.recordType === 'vitals' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">Temperature (°F)</label>
                            <input
                              type="number"
                              name="temperature"
                              step="0.1"
                              value={newRecord.vitalSigns.temperature}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Blood Pressure</label>
                            <div className="flex space-x-2">
                              <input
                                type="number"
                                name="systolic"
                                placeholder="Systolic"
                                value={newRecord.vitalSigns.bloodPressure.systolic}
                                onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns.bloodPressure')}
                                className="w-1/2 p-2 border border-gray-300 rounded"
                              />
                              <span className="self-center">/</span>
                              <input
                                type="number"
                                name="diastolic"
                                placeholder="Diastolic"
                                value={newRecord.vitalSigns.bloodPressure.diastolic}
                                onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns.bloodPressure')}
                                className="w-1/2 p-2 border border-gray-300 rounded"
                              />
                              <span className="self-center text-gray-500 text-xs">mmHg</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Heart Rate (bpm)</label>
                            <input
                              type="number"
                              name="heartRate"
                              value={newRecord.vitalSigns.heartRate}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Respiratory Rate (bpm)</label>
                            <input
                              type="number"
                              name="respiratoryRate"
                              value={newRecord.vitalSigns.respiratoryRate}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                            <input
                              type="number"
                              name="weight"
                              value={newRecord.vitalSigns.weight}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Height (cm)</label>
                            <input
                              type="number"
                              name="height"
                              value={newRecord.vitalSigns.height}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Oxygen Saturation (%)</label>
                            <input
                              type="number"
                              name="oxygenSaturation"
                              value={newRecord.vitalSigns.oxygenSaturation}
                              onChange={(e) => handleInputChange(e, setNewRecord, newRecord, 'vitalSigns')}
                              className="w-full p-2 border border-gray-300 rounded"
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea
                          name="notes"
                          value={newRecord.notes}
                          onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                          className="w-full p-2 border border-gray-300 rounded"
                        ></textarea>
                      </div>
                      
                      <div className="col-span-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="shouldEncrypt"
                            name="shouldEncrypt"
                            checked={newRecord.shouldEncrypt}
                            onChange={(e) => setNewRecord({...newRecord, shouldEncrypt: e.target.checked})}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label htmlFor="shouldEncrypt" className="ml-2 text-sm text-gray-700">
                            Encrypt with ABE (Attribute-Based Encryption)
                          </label>
                        </div>
                        {newRecord.shouldEncrypt && (
                          <p className="mt-1 text-xs text-gray-500">
                            This record will be encrypted using your hospital domain and department as attributes.
                            Only doctors with matching attributes will be able to view it.
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
                      >
                        Save Record
                      </button>
                    </div>
                  </form>
                </div>
                
                {/* Medical Records List */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-lg font-semibold mb-4">Medical Records</h2>
                  
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                    </div>
                  ) : patientRecords.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {patientRecords.map(record => (
                        <div key={record._id} className="py-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium">{
                              record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1)
                            } Record</h3>
                            <span className="text-sm text-gray-500">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="mb-1"><span className="font-medium">Diagnosis:</span> {record.diagnosis}</p>
                          
                          {record.prescription && (
                            <p className="mb-1"><span className="font-medium">Prescription:</span> {record.prescription}</p>
                          )}
                          
                          {record.recordType === 'vitals' && record.vitalSigns && (
                            <div className="mt-2 text-sm">
                              <p className="font-medium">Vital Signs:</p>
                              <p>Temperature: {record.vitalSigns.temperature || 'N/A'}°C</p>
                              {record.vitalSigns.bloodPressure && (
                                <p>Blood Pressure: {record.vitalSigns.bloodPressure.systolic || 'N/A'}/{record.vitalSigns.bloodPressure.diastolic || 'N/A'} mmHg</p>
                              )}
                              <p>Heart Rate: {record.vitalSigns.heartRate || 'N/A'} bpm</p>
                              <p>Respiratory Rate: {record.vitalSigns.respiratoryRate || 'N/A'} bpm</p>
                              <p>Weight: {record.vitalSigns.weight || 'N/A'} kg</p>
                              <p>Height: {record.vitalSigns.height || 'N/A'} cm</p>
                              <p>Oxygen Saturation: {record.vitalSigns.oxygenSaturation || 'N/A'} %</p>
                            </div>
                          )}
                          
                          {record.notes && (
                            <p className="mt-2 text-sm italic">{record.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No medical records found for this patient.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow">
                <p>Select a patient to view their records.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Appointment Form */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Schedule Appointment</h2>
            
            <form onSubmit={handleCreateAppointment}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Patient</label>
                <select
                  name="patientId"
                  value={newAppointment.patientId}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient._id} value={patient._id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={newAppointment.date}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={newAppointment.time}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={newAppointment.duration}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                  min="15"
                  step="15"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  name="reason"
                  value={newAppointment.reason}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={newAppointment.notes}
                  onChange={(e) => handleInputChange(e, setNewAppointment, newAppointment)}
                  className="w-full p-2 border border-gray-300 rounded"
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Schedule Appointment
              </button>
            </form>
          </div>
          
          {/* Appointments List */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Your Appointments</h2>
            
            {appointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3">Patient Name</th>
                      <th scope="col" className="px-6 py-3">Date</th>
                      <th scope="col" className="px-6 py-3">Time</th>
                      <th scope="col" className="px-6 py-3">Status</th>
                      <th scope="col" className="px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appointment => (
                      <tr key={appointment._id} className="bg-white border-b">
                        <td className="px-6 py-4">{appointment.patientId?.fullName || 'Unknown'}</td>
                        <td className="px-6 py-4">{new Date(appointment.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{appointment.time}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            appointment.status === 'Confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : appointment.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : appointment.status === 'Completed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                            <>
                              <button 
                                onClick={() => handleUpdateAppointment(appointment._id, 'Confirmed')}
                                className="text-blue-600 hover:underline mr-3"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => handleUpdateAppointment(appointment._id, 'Completed')}
                                className="text-green-600 hover:underline mr-3"
                              >
                                Complete
                              </button>
                              <button 
                                onClick={() => handleUpdateAppointment(appointment._id, 'Cancelled')}
                                className="text-red-600 hover:underline"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No appointments found.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Cross-Hospital Access Tab */}
      {activeTab === 'cross-hospital' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cross Hospital Access Form */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Access Patient Records</h2>
            <p className="mb-4 text-sm text-gray-600">
              Enter the patient ID to request access. If you also have the patient's access code, you'll get immediate access to their records.
            </p>
            
            <form onSubmit={handleAccessCrossHospitalData}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Patient ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="patientId"
                  value={crossHospitalAccess.patientId}
                  onChange={(e) => handleInputChange(e, setCrossHospitalAccess, crossHospitalAccess)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Required. Enter the patient's ID or 12-digit access code as ID.
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Access Code (optional)</label>
                <input
                  type="text"
                  name="accessCode"
                  value={crossHospitalAccess.accessCode}
                  onChange={(e) => handleInputChange(e, setCrossHospitalAccess, crossHospitalAccess)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional. If provided with a valid patient ID, grants immediate access.
                </p>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Access Records
              </button>
            </form>
          </div>
          
          {/* Cross Hospital Records */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow">
            {accessedPatient ? (
              <>
                {/* Patient Details */}
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-lg font-semibold mb-2">Patient Details</h2>
                  <p className="mb-1"><span className="font-medium">Name:</span> {accessedPatient.fullName}</p>
                  <p className="mb-1">
                    <span className="font-medium">Date of Birth:</span> {accessedPatient.dateOfBirth ? new Date(accessedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="mb-1"><span className="font-medium">Contact:</span> {accessedPatient.contactNo || 'N/A'}</p>
                  <p className="mb-1"><span className="font-medium">Address:</span> {accessedPatient.address || 'N/A'}</p>
                  <p className="mb-1"><span className="font-medium">Access Code:</span> {accessedPatient.accessCode}</p>
                  <p className="mt-2 text-xs text-green-600">
                    Your access to this patient's data will persist until revoked by the patient.
                  </p>
                </div>
                
                {/* Add Medical Record Form */}
                <div className="mb-6 border-b pb-4">
                  <h2 className="text-lg font-semibold mb-2">Add New Medical Record</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const token = localStorage.getItem('token');
                    
                    axios.post(
                      `${apiUrl}/doctor/records`, 
                      {
                        ...newRecord,
                        patientId: accessedPatient._id
                      },
                      {
                        headers: { Authorization: `Bearer ${token}` }
                      }
                    )
                    .then(res => {
                      alert('Medical record created successfully');
                      setCrossHospitalRecords([res.data.data, ...crossHospitalRecords]);
                      setNewRecord({
                        diagnosis: '',
                        prescription: '',
                        recordType: 'general',
                        notes: '',
                        vitalSigns: {
                          temperature: '',
                          bloodPressure: {
                            systolic: '',
                            diastolic: ''
                          },
                          heartRate: '',
                          respiratoryRate: '',
                          weight: '',
                          height: '',
                          oxygenSaturation: ''
                        },
                        shouldEncrypt: false
                      });
                    })
                    .catch(err => {
                      console.error('Error creating record:', err);
                      alert('Failed to create medical record');
                    });
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Record Type</label>
                        <select
                          name="recordType"
                          value={newRecord.recordType}
                          onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                          className="w-full p-2 border border-gray-300 rounded"
                        >
                          <option value="general">General</option>
                          <option value="lab">Lab Results</option>
                          <option value="prescription">Prescription</option>
                          <option value="vitals">Vitals</option>
                          <option value="notes">Notes</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Encrypt Record</label>
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            id="shouldEncrypt"
                            name="shouldEncrypt"
                            checked={newRecord.shouldEncrypt}
                            onChange={(e) => setNewRecord({...newRecord, shouldEncrypt: e.target.checked})}
                            className="mr-2"
                          />
                          <label htmlFor="shouldEncrypt" className="text-sm text-gray-600">
                            Encrypt sensitive data
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Diagnosis</label>
                      <textarea
                        name="diagnosis"
                        value={newRecord.diagnosis}
                        onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                        className="w-full p-2 border border-gray-300 rounded"
                        rows="2"
                        required
                      ></textarea>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Prescription</label>
                      <textarea
                        name="prescription"
                        value={newRecord.prescription}
                        onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                        className="w-full p-2 border border-gray-300 rounded"
                        rows="2"
                      ></textarea>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={newRecord.notes}
                        onChange={(e) => handleInputChange(e, setNewRecord, newRecord)}
                        className="w-full p-2 border border-gray-300 rounded"
                        rows="2"
                      ></textarea>
                    </div>
                    
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
                    >
                      Add Medical Record
                    </button>
                  </form>
                </div>
                
                <h2 className="text-lg font-semibold mb-4">Cross-Hospital Records</h2>
                
                {crossHospitalRecords.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {crossHospitalRecords.map(record => (
                      <div key={record._id} className="py-4">
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center">
                            <h3 className="font-medium">{
                              record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1)
                            } Record</h3>
                            {record.isEncrypted && (
                              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                record.accessGranted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {record.accessGranted ? 'Decrypted' : 'Encrypted'}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p className="mb-1">
                          <span className="font-medium">Hospital:</span> {record.hospitalCode}
                        </p>
                        <p className="mb-1">
                          <span className="font-medium">Department:</span> {record.departmentCode}
                        </p>
                        <p className="mb-1">
                          <span className="font-medium">Diagnosis:</span> {record.diagnosis}
                          {record.isEncrypted && !record.accessGranted && (
                            <span className="ml-2 text-xs text-red-600">
                              (Access denied: Your attributes don't match the encryption policy)
                            </span>
                          )}
                        </p>
                        
                        {record.prescription && (
                          <p className="mb-1"><span className="font-medium">Prescription:</span> {record.prescription}</p>
                        )}
                        
                        {record.recordType === 'vitals' && record.vitalSigns && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Vital Signs:</p>
                            <p>Temperature: {record.vitalSigns.temperature || 'N/A'}°C</p>
                            {record.vitalSigns.bloodPressure && (
                              <p>Blood Pressure: {record.vitalSigns.bloodPressure.systolic || 'N/A'}/{record.vitalSigns.bloodPressure.diastolic || 'N/A'} mmHg</p>
                            )}
                            <p>Heart Rate: {record.vitalSigns.heartRate || 'N/A'} bpm</p>
                            <p>Respiratory Rate: {record.vitalSigns.respiratoryRate || 'N/A'} bpm</p>
                            <p>Weight: {record.vitalSigns.weight || 'N/A'} kg</p>
                            <p>Height: {record.vitalSigns.height || 'N/A'} cm</p>
                            <p>Oxygen Saturation: {record.vitalSigns.oxygenSaturation || 'N/A'} %</p>
                          </div>
                        )}
                        
                        {record.notes && (
                          <p className="mt-2 text-sm italic">{record.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No cross-hospital records found for this patient.</p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4">Cross-Hospital Records</h2>
                <p>Access a patient using the form to view their records from all hospitals.</p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Update Profile Form */}
          <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Update Your Profile</h2>            <form onSubmit={handleUpdateProfile}>              {/* Profile Photo Upload */}              <div className="mb-6 flex flex-col items-center">                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 mb-3">                  {profileUpdateForm.profilePhoto ? (                    <img                       src={getImageUrl(profileUpdateForm.profilePhoto)}                      alt="Profile"                       className="w-full h-full object-cover"                      onError={(e) => {                        e.target.onerror = null;                        e.target.src = "https://via.placeholder.com/150?text=Profile";                        console.error("Failed to load profile photo");                      }}                    />                  ) : (                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />                      </svg>                    </div>                  )}                </div>                <label className="cursor-pointer bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200">                  <input                    type="file"                    accept="image/*"                    className="hidden"                    onChange={handleProfilePhotoChange}                  />                  Change Photo                </label>              </div>                            <div className="mb-4">                <label className="block text-sm font-medium mb-1">Full Name</label>                <input                  type="text"                  name="fullName"                  value={profileUpdateForm.fullName}                  onChange={(e) => handleInputChange(e, setProfileUpdateForm, profileUpdateForm)}                  className="w-full p-2 border border-gray-300 rounded"                  required                />              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={profileUpdateForm.specialization}
                  onChange={(e) => handleInputChange(e, setProfileUpdateForm, profileUpdateForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <input
                  type="tel"
                  name="contactNo"
                  value={profileUpdateForm.contactNo}
                  onChange={(e) => handleInputChange(e, setProfileUpdateForm, profileUpdateForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Hospital Code</label>
                <input
                  type="text"
                  name="hospitalCode"
                  value={profileUpdateForm.hospitalCode}
                  onChange={(e) => handleInputChange(e, setProfileUpdateForm, profileUpdateForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Department Code</label>
                <input
                  type="text"
                  name="departmentCode"
                  value={profileUpdateForm.departmentCode}
                  onChange={(e) => handleInputChange(e, setProfileUpdateForm, profileUpdateForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Update Profile
              </button>
            </form>
          </div>
          
          {/* Current Profile Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Your Current Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-500">Full Name</h3>
                <p className="font-medium">{doctorProfile?.fullName || user?.name || 'Not set'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Email Address</h3>
                <p className="font-medium">{user?.email || 'Not available'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Specialization</h3>
                <p className="font-medium">{doctorProfile?.specialization || 'Not set'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Contact Number</h3>
                <p className="font-medium">{doctorProfile?.contactNo || 'Not set'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Hospital</h3>
                <p className="font-medium">{doctorProfile?.hospitalCode || user?.hospitalCode || 'Not set'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Department</h3>
                <p className="font-medium">{doctorProfile?.departmentCode || user?.departmentCode || 'Not set'}</p>
              </div>
              
              <div>
                <h3 className="text-sm text-gray-500">Account ID</h3>
                <p className="font-medium font-mono text-sm">{doctorProfile?._id || user?.id || 'Not available'}</p>
              </div>
            </div>
          </div>
          
          {/* Hospital Settings */}
          <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Hospital Information</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your hospital and department codes are used for patient record access control and ABE encryption.
              Please ensure these are correctly set to enable proper functioning of the system.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Hospital Code</h3>
                <p>{doctorProfile?.hospitalCode || user?.hospitalCode || 'Not set'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  This identifies your hospital in the system and is used for cross-hospital access.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Department Code</h3>
                <p>{doctorProfile?.departmentCode || user?.departmentCode || 'Not set'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your department code is used for ABE encryption policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard; 