import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PatientDashboard = () => {
  const [records, setRecords] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  useEffect(() => {
    // Fetch patient records
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${apiUrl}/records`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecords(res.data.data || []);
      } catch (err) {
        console.error('Error fetching records:', err);
        setError('Failed to load medical records');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecords();
  }, [apiUrl]);
  
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
      // Optionally refresh the records
    } catch (err) {
      console.error('File upload error:', err);
      alert('File upload failed');
    }
  };
  
  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${apiUrl}/pdf/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'credentials.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF');
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Patient Dashboard</h1>
      
      {/* Patient Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-medium">{user?.username || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Email</p>
            <p className="font-medium">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Access Code</p>
            <p className="font-medium bg-gray-100 p-2 rounded text-red-600">
              {/* This would come from the patient profile */}
              XXXX-XXXX
            </p>
          </div>
        </div>
      </div>
      
      {/* Medical Records */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Medical Records</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {records.length === 0 ? (
          <p className="text-gray-600">No records found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {records.map((record) => (
              <li key={record._id} className="py-4">
                <div className="flex flex-col md:flex-row md:justify-between">
                  <div className="mb-2 md:mb-0">
                    <p className="text-lg font-medium">{record.diagnosis}</p>
                    <p className="text-gray-600">
                      Prescription: {record.prescription}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Doctor: Dr. {record.doctor?.fullName || 'Unknown'}</p>
                    <p>Date: {new Date(record.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
      
      {/* Download PDF */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Download Credentials PDF</h2>
        <p className="text-gray-600 mb-4">
          Download your credentials and access code information.
        </p>
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default PatientDashboard; 