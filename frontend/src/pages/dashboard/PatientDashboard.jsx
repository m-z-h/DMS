import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [accessGrants, setAccessGrants] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    contactNo: '',
    address: ''
  });
  
  const [appointmentForm, setAppointmentForm] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  
  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  useEffect(() => {
    fetchAllData();
  }, [apiUrl]);
  
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Create promises for all API calls
      const profilePromise = axios.get(`${apiUrl}/patient/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        console.error('Error fetching profile:', err);
        return { data: { data: null } };
      });
      
      const recordsPromise = axios.get(`${apiUrl}/patient/records`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        console.error('Error fetching records:', err);
        return { data: { data: [] } };
      });
      
      const appointmentsPromise = axios.get(`${apiUrl}/patient/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        console.error('Error fetching appointments:', err);
        return { data: { data: [] } };
      });
      
      const grantsPromise = axios.get(`${apiUrl}/patient/access/grants`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        console.error('Error fetching access grants:', err);
        return { data: { data: [] } };
      });
      
      const requestsPromise = axios.get(`${apiUrl}/patient/access/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(err => {
        console.error('Error fetching access requests:', err);
        return { data: { data: [] } };
      });
      
      // Execute all promises in parallel
      const [profileRes, recordsRes, appointmentsRes, grantsRes, requestsRes] = 
        await Promise.all([profilePromise, recordsPromise, appointmentsPromise, grantsPromise, requestsPromise]);
      
      // Update state with fetched data
      setPatientInfo(profileRes.data.data);
      setRecords(recordsRes.data.data || []);
      setAppointments(appointmentsRes.data.data || []);
      setAccessGrants(grantsRes.data.data || []);
      setAccessRequests(requestsRes.data.data || []);
      
      // Populate personal info form
      if (profileRes.data.data) {
        setPersonalInfo({
          fullName: profileRes.data.data.fullName || '',
          contactNo: profileRes.data.data.contactNo || '',
          address: profileRes.data.data.address || ''
        });
      }
      
      // Also fetch available doctors for appointment booking
      try {
        const doctorsRes = await axios.get(`${apiUrl}/patient/doctors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDoctors(doctorsRes.data.data || []);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setDoctors([]);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${apiUrl}/patient/profile`, personalInfo, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert('Profile updated successfully');
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };
  
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert('File uploaded successfully');
      setFile(null);
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('File upload error:', err);
      alert('File upload failed');
    }
  };
  
  const handleRequestAppointment = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${apiUrl}/patient/appointments/request`, appointmentForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert('Appointment requested successfully');
      setAppointmentForm({
        doctorId: '',
        date: '',
        time: '',
        reason: ''
      });
      fetchAllData(); // Refresh appointments
    } catch (err) {
      console.error('Error requesting appointment:', err);
      setError('Failed to request appointment');
    }
  };
  
  const handleDownloadPDF = async (type = 'credentials') => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'medicalReport' 
        ? `${apiUrl}/patient/records/download` 
        : `${apiUrl}/pdf/credentials`;
        
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const filename = type === 'medicalReport' 
        ? 'medical_report.pdf' 
        : 'credentials.pdf';
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF');
    }
  };
  
  const handleGenerateNewAccessCode = async () => {
    if (!confirm("Are you sure you want to generate a new access code? This will invalidate the old one.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${apiUrl}/patient/access/regenerate-code`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert('New access code generated successfully');
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error generating access code:', err);
      setError('Failed to generate new access code');
    }
  };
  
  const handleRevokeAccess = async (doctorId) => {
    if (!confirm("Are you sure you want to revoke this doctor's access?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/patient/access/revoke/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      alert('Access revoked successfully');
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error revoking access:', err);
      setError('Failed to revoke access');
    }
  };
  
  const handleRespondToRequest = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${apiUrl}/patient/access/requests/${requestId}`, 
        { status, responseMessage: status === 'approved' ? 'Access approved' : 'Access denied' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      alert(`Request ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      fetchAllData(); // Refresh data
    } catch (err) {
      console.error('Error responding to request:', err);
      setError('Failed to respond to request');
    }
  };
  
  const handleInputChange = (e, setter) => {
    const { name, value } = e.target;
    setter(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  if (loading && !patientInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Patient Dashboard</h1>
      
      {/* Dashboard Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex flex-wrap space-x-4">
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('records')}
          >
            Medical Records
          </button>
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'appointments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('appointments')}
          >
            Appointments
          </button>
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'access'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('access')}
          >
            Access Management
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
        <div className="space-y-6">
          {/* Patient Info Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome, {patientInfo?.fullName || user?.username}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600">Access Code</p>
                <p className="font-medium bg-gray-100 p-2 rounded text-red-600">
                  {patientInfo?.accessCode || 'Not available'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            
            {/* Recent Records */}
            <h3 className="font-medium text-gray-700 mb-2">Recent Medical Records</h3>
            {records.length > 0 ? (
              <ul className="mb-4">
                {records.slice(0, 3).map((record) => (
                  <li key={record._id} className="mb-2 py-2 border-b">
                    <p className="font-medium">{record.diagnosis}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 mb-4">No recent records</p>
            )}
            
            {/* Upcoming Appointments */}
            <h3 className="font-medium text-gray-700 mb-2">Upcoming Appointments</h3>
            {appointments.length > 0 ? (
              <ul>
                {appointments
                  .filter(apt => new Date(apt.date) >= new Date() && ['Scheduled', 'Confirmed'].includes(apt.status))
                  .slice(0, 3)
                  .map((apt) => (
                    <li key={apt._id} className="mb-2 py-2 border-b">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">Dr. {apt.doctorId?.fullName || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(apt.date).toLocaleDateString()} at {apt.time}
                          </p>
                        </div>
                        <span className={`px-2 py-1 h-fit rounded-full text-xs ${
                          apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-gray-500">No upcoming appointments</p>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('records')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                View All Records
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none"
              >
                Schedule Appointment
              </button>
              <button
                onClick={() => handleDownloadPDF('medicalReport')}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none"
              >
                Download Medical Report
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Medical Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Medical Records</h2>
              <button
                onClick={() => handleDownloadPDF('medicalReport')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Download PDF Report
              </button>
            </div>
            
            {records.length === 0 ? (
              <p className="text-gray-600">No records found.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {records.map((record) => (
                  <li key={record._id} className="py-4">
                    <div className="flex flex-col md:flex-row md:justify-between">
                      <div className="mb-2 md:mb-0">
                        <p className="text-lg font-medium">{record.diagnosis}</p>
                        {record.prescription && (
                          <p className="text-gray-600">
                            <span className="font-medium">Prescription:</span> {record.prescription}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-gray-600">
                            <span className="font-medium">Notes:</span> {record.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p><span className="font-medium">Hospital:</span> {record.hospitalCode}</p>
                        <p><span className="font-medium">Department:</span> {record.departmentCode}</p>
                        <p><span className="font-medium">Doctor:</span> Dr. {record.doctorId?.fullName || 'Unknown'}</p>
                        <p><span className="font-medium">Date:</span> {new Date(record.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Medical Report</h2>
            <form onSubmit={handleFileUpload}>
              <div className="mb-4">
                <label 
                  htmlFor="file" 
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Select File (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  id="file"
                  accept=".pdf,.jpg,.png"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={!file}
                className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none ${
                  !file ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Upload
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Appointment Form */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Request Appointment</h2>
            <form onSubmit={handleRequestAppointment}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Doctor</label>
                <select
                  name="doctorId"
                  value={appointmentForm.doctorId}
                  onChange={(e) => handleInputChange(e, setAppointmentForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">-- Select Doctor --</option>
                  {doctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      Dr. {doctor.fullName} - {doctor.hospitalCode} ({doctor.departmentCode})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={appointmentForm.date}
                  onChange={(e) => handleInputChange(e, setAppointmentForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={appointmentForm.time}
                  onChange={(e) => handleInputChange(e, setAppointmentForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  name="reason"
                  value={appointmentForm.reason}
                  onChange={(e) => handleInputChange(e, setAppointmentForm)}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="3"
                  required
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Request Appointment
              </button>
            </form>
          </div>
          
          {/* Appointments List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Appointments</h2>
            
            {appointments.length === 0 ? (
              <p className="text-gray-600">No appointments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3">Doctor</th>
                      <th scope="col" className="px-4 py-3">Department</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Time</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appointment => (
                      <tr key={appointment._id} className="bg-white border-b">
                        <td className="px-4 py-3">Dr. {appointment.doctorId?.fullName || 'Unknown'}</td>
                        <td className="px-4 py-3">{appointment.departmentCode}</td>
                        <td className="px-4 py-3">{new Date(appointment.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{appointment.time}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            appointment.status === 'Confirmed' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'Cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {appointment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Update Personal Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Update Personal Information</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={personalInfo.fullName}
                  onChange={(e) => handleInputChange(e, setPersonalInfo)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <input
                  type="tel"
                  name="contactNo"
                  value={personalInfo.contactNo}
                  onChange={(e) => handleInputChange(e, setPersonalInfo)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  name="address"
                  value={personalInfo.address}
                  onChange={(e) => handleInputChange(e, setPersonalInfo)}
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="3"
                  required
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
              >
                Update Profile
              </button>
            </form>
          </div>
          
          {/* Current Info and PDF Downloads */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Current Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-medium">{patientInfo?.fullName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Contact Number</p>
                  <p className="font-medium">{patientInfo?.contactNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date of Birth</p>
                  <p className="font-medium">
                    {patientInfo?.dateOfBirth ? new Date(patientInfo.dateOfBirth).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-600">Address</p>
                <p className="font-medium">{patientInfo?.address || 'N/A'}</p>
              </div>
            </div>
            
            {/* Download PDF */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Download PDF Reports</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Registration Details</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Download your registration details including your access code.
                  </p>
                  <button
                    onClick={() => handleDownloadPDF('credentials')}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none"
                  >
                    Download Registration PDF
                  </button>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Medical Report</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Download your complete medical history with doctor notes.
                  </p>
                  <button
                    onClick={() => handleDownloadPDF('medicalReport')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
                  >
                    Download Medical Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Access Management Tab */}
      {activeTab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Access Code Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Your Access Code</h2>
            <p className="mb-4 text-sm text-gray-600">
              Your access code allows doctors to access your medical records. Share it only with doctors you trust.
            </p>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your current access code</p>
                  <p className="text-xl font-mono font-bold text-red-600">{patientInfo?.accessCode || 'Not available'}</p>
                </div>
                <button
                  onClick={handleGenerateNewAccessCode}
                  className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 focus:outline-none"
                >
                  Generate New Code
                </button>
              </div>
            </div>
            
            <h3 className="font-medium mb-2">Access Requests</h3>
            {accessRequests.length === 0 ? (
              <p className="text-gray-500">No pending access requests</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {accessRequests.map(request => (
                  <li key={request._id} className="py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Dr. {request.doctorId?.fullName || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">
                          {request.message || 'No message provided'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {request.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRespondToRequest(request._id, 'approved')}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRespondToRequest(request._id, 'rejected')}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                          >
                            Deny
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-1 h-fit rounded-full text-xs ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'approved' ? 'Approved' : 'Denied'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Granted Access Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Doctors With Access</h2>
            <p className="mb-4 text-sm text-gray-600">
              Manage which doctors have access to your medical records. You can revoke access at any time.
            </p>
            
            {accessGrants.length === 0 ? (
              <p className="text-gray-500">No doctors currently have access to your records</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {accessGrants.map(grant => (
                  <li key={grant._id} className="py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">Dr. {grant.doctorId?.fullName || 'Unknown'}</p>
                        <p className="text-sm">
                          <span className="text-gray-600">Hospital:</span> {grant.doctorId?.hospitalCode || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Access level: {grant.accessLevel === 'readWrite' ? 'Read & Write' : 'Read Only'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(grant.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleRevokeAccess(grant.doctorId)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none h-fit"
                      >
                        Revoke Access
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard; 