import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PatientDashboard = () => {
  // Debug function for image loading issues
  const debugImageUrl = (url, source) => {
    console.log(`[DEBUG] Image URL (${source}):`, url);
    return url;
  };
  
  // Utility to construct proper image URLs for database-stored files
  const getImageUrl = (filename) => {
    if (!filename) return null;
    
    // If it's a data URL, keep as is
    if (filename.startsWith('data:')) return filename;
    
    // If it's already a full URL, keep as is
    if (filename.startsWith('http')) return filename;
    
    // Get API base URL from environment or default
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    
    // For documents or images stored in the database
    if (filename.match(/^[0-9a-fA-F]{24}$/)) {
      // This looks like a MongoDB ObjectId - use the document endpoint
      return `${baseUrl}/files/document/${filename}`;
    }
    
    // For profile photos or other images, use the document endpoint
    return `${baseUrl}/files/document/${filename}`;
  };
  
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
  const [activeRecordTabs, setActiveRecordTabs] = useState({});
  const [recordFilter, setRecordFilter] = useState('');
  const { user } = useAuth();
  
  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    contactNo: '',
    address: '',
    profilePhoto: null
  });
  
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  
  const [appointmentForm, setAppointmentForm] = useState({
    doctorId: '',
    date: '',
    time: '',
    reason: ''
  });
  
  // Add a new state for uploaded files
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Add a new state for medical documents after the other state variables
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [documentUploadForm, setDocumentUploadForm] = useState({
    file: null,
    documentType: 'Other',
    description: ''
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentUpdateForm, setDocumentUpdateForm] = useState({
    documentType: '',
    description: ''
  });
  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  
  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  useEffect(() => {
    fetchAllData();
  }, [apiUrl]);
  
  // Add debugging for access grants
  useEffect(() => {
    console.log("Access grants updated:", accessGrants);
  }, [accessGrants]);
  
  // Add this function to safely fetch uploaded files
  const fetchUploadedFiles = async () => {
    try {
      console.log('Fetching uploaded files...');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token is missing');
        return;
      }
      
            const response = await axios.get(`${apiUrl}/files/patient`, {        headers: { Authorization: `Bearer ${token}` }      });
      
      if (response.data.success) {
        console.log('Fetched files:', response.data.data);
        setUploadedFiles(response.data.data);
      } else {
        setError('Failed to fetch files');
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Error retrieving files: ' + (err.response?.data?.message || err.message));
    }
  };
  
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token || !navigator.onLine) {
        setLoading(false);
        if (!navigator.onLine) setError('You are offline. Please check your internet connection.');
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Create promises for all API calls with signal for timeout
      const profilePromise = axios.get(`${apiUrl}/patient/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching profile:', err);
        return { data: { data: null } };
      });
      
      const recordsPromise = axios.get(`${apiUrl}/patient/records`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching records:', err);
        return { data: { data: [] } };
      });
      
      const appointmentsPromise = axios.get(`${apiUrl}/patient/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching appointments:', err);
        return { data: { data: [] } };
      });
      
      const grantsPromise = axios.get(`${apiUrl}/patient/access/grants`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching access grants:', err);
        return { data: { data: [] } };
      });
      
      const requestsPromise = axios.get(`${apiUrl}/patient/access/requests`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching access requests:', err);
        return { data: { data: [] } };
      });
      
      // Add files promise
      const filesPromise = axios.get(`${apiUrl}/files/patient`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }).catch(err => {
        console.error('Error fetching files:', err);
        return { data: { data: [] } };
      });
      
      try {
        // Execute all promises in parallel
        const [profileRes, recordsRes, appointmentsRes, grantsRes, requestsRes, filesRes] = 
          await Promise.all([profilePromise, recordsPromise, appointmentsPromise, grantsPromise, requestsPromise, filesPromise]);
        
        clearTimeout(timeoutId);
        
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
            address: profileRes.data.data.address || '',
            profilePhoto: profileRes.data.data.profilePhoto || null
          });
        }
        
        // Update files state
        setUploadedFiles(filesRes.data.data || []);
        
        // Also fetch available doctors for appointment booking
        try {
          const doctorsRes = await axios.get(`${apiUrl}/patient/doctors`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          // Get doctors with active access - doctors we can book appointments with
          const accessibleDoctorIds = new Set(
            grantsRes.data.data
              .filter(grant => grant.accessLevel === 'readWrite' || grant.accessLevel === 'read')
              .map(grant => grant.doctorId._id)
          );
          
          // Make all doctors available for appointment booking
          // The backend will handle access control appropriately
          setDoctors(doctorsRes.data.data || []);
          
          console.log('Available doctors:', doctorsRes.data.data.length);
          console.log('Doctors with access:', accessibleDoctorIds.size);
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Error fetching doctors:', err);
          }
          setDoctors([]);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          console.error('Error in Promise.all:', err);
          setError('Failed to load data. Please check your connection and try again.');
        }
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
      let profilePhotoUrl = personalInfo.profilePhoto;
      
      if (!token || !navigator.onLine) {
        alert('You seem to be offline. Please check your connection and try again.');
        return;
      }
      
      // Show uploading indicator
      setError(null);
      setLoading(true);
      
      // If there's a new profile photo, upload it first
      if (profilePhotoFile) {
        try {
          const formData = new FormData();
          formData.append('file', profilePhotoFile);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          const uploadRes = await axios.post(`${apiUrl}/files/upload`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (uploadRes.data.success) {
            // Fix the property path - response contains document, not file
            const filename = uploadRes.data.document.filename;
            profilePhotoUrl = filename;
          } else {
            throw new Error('File upload failed');
          }
        } catch (uploadErr) {
          if (uploadErr.name === 'AbortError') {
            setLoading(false);
            alert('Image upload timed out. Please try a smaller image.');
            return;
          } else {
            console.error('Profile photo upload error:', uploadErr);
            alert('Failed to upload profile photo. Profile information will be updated without the new photo.');
          }
        }
      }
      
      // Create updated profile data with possibly new photo URL
      const updatedProfile = {
        ...personalInfo,
        profilePhoto: profilePhotoUrl
      };
      
      // Update the profile
      const updateRes = await axios.put(`${apiUrl}/patient/profile`, updatedProfile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state with new profile data
      if (updateRes.data.success) {
        // Update the local states
        setPersonalInfo(prev => ({
          ...prev,
          profilePhoto: profilePhotoUrl
        }));
        
        // Also update patientInfo to display in Current Information section
        setPatientInfo(prev => ({
          ...prev,
          fullName: updatedProfile.fullName,
          contactNo: updatedProfile.contactNo,
          address: updatedProfile.address,
          profilePhoto: profilePhotoUrl
        }));
        
        alert('Profile updated successfully');
      } else {
        alert('Failed to update profile');
      }
      
      setProfilePhotoFile(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };
  
  // Update handleFileUpload to be more robust
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!file) return;
    
    try {
      console.log('Starting file upload for:', file.name, 'Size:', Math.round(file.size/1024), 'KB');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for uploads
      
      console.log('Sending upload request...');
      const response = await axios.post(`${apiUrl}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Upload response:', response.data);
      
      alert('File uploaded successfully');
      setFile(null);
      
      // Only fetch files again if the upload was successful
      if (response.data.success) {
        // Add short delay before fetching updated files
        setTimeout(() => fetchUploadedFiles(), 500);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        alert('Upload timed out. Please try again with a smaller file.');
      } else {
        console.error('File upload error:', err);
        alert('File upload failed');
      }
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
      setError(null); // Clear any previous errors
      const token = localStorage.getItem('token');
      const endpoint = type === 'medicalReport' 
        ? `${apiUrl}/patient/records/download` 
        : `${apiUrl}/pdf/credentials`;
      
      // Show loading indicator
      const loadingMessage = type === 'medicalReport' 
        ? 'Generating medical report...' 
        : 'Downloading credentials...';
      alert(loadingMessage);
        
      // For medical records, open in a new tab instead of downloading directly
      if (type === 'medicalReport') {
        try {
          // First fetch the PDF
          const res = await axios.get(endpoint, {
            headers: { 
              Authorization: `Bearer ${token}`,
            },
            responseType: 'blob'
          });
          
          // Then open it in a new tab
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          
          // Open the PDF in a new tab
          const newWindow = window.open(url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // If popup blocked, provide direct download instead
            alert('Popup blocked. The PDF will be downloaded directly.');
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `medical_report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } catch (err) {
          console.error('Error opening medical report:', err);
          throw new Error('Could not open the medical report. Please try again.');
        }
      } else {
        // For credentials PDF, download as usual
        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        });
        
        if (res.data.size < 100) { // Check if response is too small to be a valid PDF
          throw new Error('The server returned an invalid PDF file');
        }
        
        const filename = `credentials_${new Date().toISOString().split('T')[0]}.pdf`;
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('PDF download error:', err);
      setError(`Failed to download PDF: ${err.message || 'Unknown error'}`);
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
  
  const handleRevokeAccess = async (doctorId, currentAccessLevel) => {
    const message = currentAccessLevel === 'readWrite' 
      ? "Are you sure you want to restrict this doctor's access to read-only? They will only be able to view existing records but not create or modify them." 
      : "Are you sure you want to completely revoke this doctor's access? They will no longer be able to access any of your records.";
    
    if (!confirm(message)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${apiUrl}/patient/access/revoke/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Update local state immediately
      if (currentAccessLevel === 'readWrite') {
        // When restricting access, we'll change the access level in the local state
        setAccessGrants(prevGrants => 
          prevGrants.map(grant => 
            grant.doctorId._id === doctorId 
              ? { ...grant, accessLevel: 'read' } 
              : grant
          )
        );
      } else {
        // When revoking access completely, remove the grant from local state
        setAccessGrants(prevGrants => 
          prevGrants.filter(grant => grant.doctorId._id !== doctorId)
        );
      }
      
      const actionType = currentAccessLevel === 'readWrite' ? 'restricted to read-only' : 'revoked';
      alert(`Access ${actionType} successfully`);
      
      // Also refresh all data to ensure everything is up to date
      fetchAllData();
    } catch (err) {
      console.error('Error revoking access:', err);
      setError('Failed to change access permissions');
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
  
  // Handle record tab selection
  const handleRecordTab = (recordId, tabName) => {
    setActiveRecordTabs(prev => ({
      ...prev,
      [recordId]: tabName
    }));
  };
  
  // Add this function to handle record filtering
  const handleRecordFilterChange = (e) => {
    setRecordFilter(e.target.value);
  };
  
  // Function to get filtered records
  const getFilteredRecords = () => {
    if (!recordFilter) return records;
    
    return records.filter(record => 
      record.recordType === recordFilter
    );
  };
  
  // Add this function to handle profile photo upload
  const handleProfilePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('Selected profile photo:', selectedFile.name, 'Size:', Math.round(selectedFile.size/1024), 'KB');
      
      setProfilePhotoFile(selectedFile);
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log('Preview created for profile photo');
        setPersonalInfo(prev => ({
          ...prev,
          profilePhoto: event.target.result
        }));
      };
      reader.readAsDataURL(selectedFile);
    }
  };
  
  // Add fetchMedicalDocuments function to useEffect
  useEffect(() => {
    // ... existing code ...
    
    // Add fetchMedicalDocuments to fetch all medical documents
    const fetchMedicalDocuments = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const res = await axios.get(`${apiUrl}/files/my-documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.success) {
          setMedicalDocuments(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching medical documents:', err);
      }
    };

    // Call the function to fetch medical documents
    if (activeTab === 'documents') {
      fetchMedicalDocuments();
    }
    
  }, [activeTab, apiUrl]);

  // Add document upload handler
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setFileUploadLoading(true);
    
    try {
      if (!documentUploadForm.file) {
        alert('Please select a file to upload');
        setFileUploadLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', documentUploadForm.file);
      formData.append('documentType', documentUploadForm.documentType);
      formData.append('description', documentUploadForm.description);
      
      const res = await axios.post(
        `${apiUrl}/files/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (res.data.success) {
        // Reset the form
        setDocumentUploadForm({
          file: null,
          documentType: 'Other',
          description: ''
        });
        
        // Refresh the document list
        const updatedDocs = await axios.get(
          `${apiUrl}/files/my-documents`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (updatedDocs.data.success) {
          setMedicalDocuments(updatedDocs.data.data);
        }
        
        alert('Document uploaded successfully');
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      alert('Failed to upload document. Please try again.');
    } finally {
      setFileUploadLoading(false);
    }
  };

  // Add document file change handler
  const handleDocumentFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentUploadForm({
        ...documentUploadForm,
        file: e.target.files[0]
      });
    }
  };

  // Add document update handler
  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.put(
        `${apiUrl}/files/document/${selectedDocument._id}`,
        {
          documentType: documentUpdateForm.documentType,
          description: documentUpdateForm.description
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        // Update the document in the local state
        const updatedDocuments = medicalDocuments.map(doc => {
          if (doc._id === selectedDocument._id) {
            return { ...doc, ...res.data.data };
          }
          return doc;
        });
        
        setMedicalDocuments(updatedDocuments);
        setSelectedDocument(res.data.data);
        alert('Document updated successfully');
      }
    } catch (err) {
      console.error('Error updating document:', err);
      alert('Failed to update document. Please try again.');
    }
  };

  // Add document delete handler
  const handleDeleteDocument = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      
      const confirmed = window.confirm('Are you sure you want to delete this document? This action cannot be undone.');
      
      if (!confirmed) return;
      
      const res = await axios.delete(
        `${apiUrl}/files/document/${documentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (res.data.success) {
        // Remove the document from the local state
        setMedicalDocuments(medicalDocuments.filter(doc => doc._id !== documentId));
        
        if (selectedDocument && selectedDocument._id === documentId) {
          setSelectedDocument(null);
        }
        
        alert('Document deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document. Please try again.');
    }
  };

  // Add document selection handler
  const handleSelectDocument = (document) => {
    setSelectedDocument(document);
    setDocumentUpdateForm({
      documentType: document.documentType,
      description: document.description
    });
  };

  // Add getter for document icon
  const getDocumentIcon = (mimetype) => {
    if (mimetype.includes('pdf')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
    } else if (mimetype.includes('image')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
    }
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
          <button
            className={`py-3 px-1 border-b-2 ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('documents')}
          >
            Medical Documents
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Medical Records</h2>
                <p className="text-sm text-gray-500 mt-1">Your complete medical history</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownloadPDF('medicalReport')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                  Download PDF Report
                </button>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter by:</span>
                <select 
                  className="p-2 border border-gray-300 rounded-md text-sm"
                  value={recordFilter}
                  onChange={handleRecordFilterChange}
                >
                  <option value="">All Types</option>
                  <option value="general">General</option>
                  <option value="lab">Lab Results</option>
                  <option value="imaging">Imaging</option>
                  <option value="prescription">Prescriptions</option>
                  <option value="vitals">Vital Signs</option>
                  <option value="treatment">Treatment</option>
                  <option value="medication">Medication</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-purple-400"></span>
                  <span className="text-xs text-gray-600">Encrypted</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-400"></span>
                  <span className="text-xs text-gray-600">Recent</span>
                </div>
              </div>
            </div>
            
            {getFilteredRecords().length === 0 ? (
              <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-2">No medical records found.</p>
                <p className="text-sm text-gray-500">Your records will appear here once a doctor creates them.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {getFilteredRecords().map((record) => (
                  <div key={record._id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    {/* Record Header */}
                    <div className={`p-4 border-b border-gray-200 ${
                      record.isEncrypted ? 'bg-purple-50' : 
                      new Date(record.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-medium flex items-center">
                            {record.diagnosis}
                            {record.permissions?.restrictedAccess && 
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                Restricted
                              </span>
                            }
                            {record.isEncrypted && 
                              <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                Encrypted
                              </span>
                            }
                            {new Date(record.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                New
                              </span>
                            }
                          </h3>
                          <div className="flex items-center mt-1 text-sm space-x-2">
                            <span className="text-gray-500">
                              Record Type: <span className="font-medium">{record.recordType.charAt(0).toUpperCase() + record.recordType.slice(1)}</span>
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-right flex flex-col items-end">
                          <div className="flex items-center mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <p className="font-medium">Dr. {record.doctorId?.fullName || 'Unknown'}</p>
                          </div>
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                            </svg>
                            <p className="text-xs text-gray-500">{record.hospitalCode} | {record.departmentCode}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tabs for different record sections */}
                    <div>
                      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
                        <button 
                          className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                            (!activeRecordTabs[record._id] || activeRecordTabs[record._id] === 'overview') 
                              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                          onClick={() => handleRecordTab(record._id, 'overview')}
                        >
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Overview
                          </div>
                        </button>
                        
                        {(record.vitalSigns && Object.values(record.vitalSigns).some(val => val)) || 
                         (record.vital && Object.values(record.vital).some(val => val)) && (
                          <button 
                            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                              activeRecordTabs[record._id] === 'vitals' 
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => handleRecordTab(record._id, 'vitals')}
                          >
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Vital Signs
                            </div>
                          </button>
                        )}
                        
                        {record.treatmentPlan && (
                          record.treatmentPlan.carePlan || 
                          record.treatmentPlan.procedures?.length > 0 || 
                          record.treatmentPlan.icdCodes?.length > 0
                        ) && (
                          <button 
                            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                              activeRecordTabs[record._id] === 'treatment' 
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => handleRecordTab(record._id, 'treatment')}
                          >
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Treatment Plan
                            </div>
                          </button>
                        )}
                        
                        {record.labResults?.length > 0 && (
                          <button 
                            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                              activeRecordTabs[record._id] === 'labs' 
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => handleRecordTab(record._id, 'labs')}
                          >
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Lab Results
                            </div>
                          </button>
                        )}
                        
                        {record.medications?.length > 0 && (
                          <button 
                            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                              activeRecordTabs[record._id] === 'medications' 
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => handleRecordTab(record._id, 'medications')}
                          >
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Medications
                            </div>
                          </button>
                        )}
                        
                        {record.imaging?.length > 0 && (
                          <button 
                            className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                              activeRecordTabs[record._id] === 'imaging' 
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                            }`}
                            onClick={() => handleRecordTab(record._id, 'imaging')}
                          >
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              Imaging
                            </div>
                          </button>
                        )}
                      </div>
                      
                      {/* Overview Content */}
                      {(!activeRecordTabs[record._id] || activeRecordTabs[record._id] === 'overview') && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-700 mb-2">Diagnosis</h4>
                              <p className="text-gray-800">{record.diagnosis}</p>
                            </div>
                            
                            {record.prescription && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">Prescription</h4>
                                <p className="text-gray-800 whitespace-pre-line">{record.prescription}</p>
                              </div>
                            )}
                            
                            {record.notes && (
                              <div className="bg-gray-50 p-3 rounded-lg md:col-span-2">
                                <h4 className="font-medium text-gray-700 mb-2">Additional Notes</h4>
                                <p className="text-gray-800 whitespace-pre-line">{record.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Vital Signs Content */}
                      {activeRecordTabs[record._id] === 'vitals' && (record.vitalSigns || record.vital) && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {(record.vitalSigns?.temperature || record.vital?.temperature) && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Temperature</p>
                                <p className="text-xl font-medium">{record.vitalSigns?.temperature || record.vital?.temperature}°C</p>
                              </div>
                            )}
                            
                            {(record.vitalSigns?.bloodPressure || record.vital?.bloodPressure) && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Blood Pressure</p>
                                <p className="text-xl font-medium">
                                  {record.vitalSigns?.bloodPressure ? 
                                    `${record.vitalSigns.bloodPressure.systolic || '-'}/${record.vitalSigns.bloodPressure.diastolic || '-'}` : 
                                    record.vital?.bloodPressure}
                                  <span className="text-sm text-gray-500"> mmHg</span>
                                </p>
                              </div>
                            )}
                            
                            {(record.vitalSigns?.heartRate || record.vital?.heartRate) && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Heart Rate</p>
                                <p className="text-xl font-medium">{record.vitalSigns?.heartRate || record.vital?.heartRate} <span className="text-sm text-gray-500">bpm</span></p>
                              </div>
                            )}
                            
                            {record.vitalSigns?.respiratoryRate && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Respiratory Rate</p>
                                <p className="text-xl font-medium">{record.vitalSigns.respiratoryRate} <span className="text-sm text-gray-500">breaths/min</span></p>
                              </div>
                            )}
                            
                            {record.vital?.sugarLevel && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Blood Sugar</p>
                                <p className="text-xl font-medium">{record.vital.sugarLevel} <span className="text-sm text-gray-500">mg/dL</span></p>
                              </div>
                            )}
                            
                            {record.vitalSigns?.weight && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Weight</p>
                                <p className="text-xl font-medium">{record.vitalSigns.weight} <span className="text-sm text-gray-500">kg</span></p>
                              </div>
                            )}
                            
                            {record.vitalSigns?.height && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Height</p>
                                <p className="text-xl font-medium">{record.vitalSigns.height} <span className="text-sm text-gray-500">cm</span></p>
                              </div>
                            )}
                            
                            {record.vitalSigns?.bmi && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">BMI</p>
                                <p className="text-xl font-medium">{record.vitalSigns.bmi}</p>
                              </div>
                            )}
                            
                            {record.vitalSigns?.oxygenSaturation && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Oxygen Saturation</p>
                                <p className="text-xl font-medium">{record.vitalSigns.oxygenSaturation}<span className="text-sm text-gray-500">%</span></p>
                              </div>
                            )}
                          </div>
                          
                          {record.vitalSigns?.recordedAt && (
                            <p className="mt-4 text-xs text-gray-500 text-right">
                              Recorded on: {new Date(record.vitalSigns.recordedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Treatment Plan Content */}
                      {activeRecordTabs[record._id] === 'treatment' && record.treatmentPlan && (
                        <div className="p-4 bg-white">
                          {record.treatmentPlan.carePlan && (
                            <div className="p-3 bg-gray-50 rounded-lg mb-4">
                              <h4 className="font-medium text-gray-700 mb-2">Care Plan</h4>
                              <p className="whitespace-pre-line">{record.treatmentPlan.carePlan}</p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {record.treatmentPlan.icdCodes?.length > 0 && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">Diagnosis Codes (ICD)</h4>
                                <ul className="space-y-1">
                                  {record.treatmentPlan.icdCodes.map((code, idx) => (
                                    <li key={idx} className="flex justify-between">
                                      <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">{code.code}</span>
                                      <span className="text-gray-700">{code.description}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {record.treatmentPlan.procedures?.length > 0 && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">Procedures</h4>
                                <ul className="space-y-2">
                                  {record.treatmentPlan.procedures.map((proc, idx) => (
                                    <li key={idx} className="border-l-2 border-blue-400 pl-2">
                                      <p className="font-medium">{proc.name}</p>
                                      <p className="text-xs text-gray-500">
                                        Scheduled: {new Date(proc.date).toLocaleDateString()}
                                      </p>
                                      {proc.notes && (
                                        <p className="text-sm mt-1 italic text-gray-600">{proc.notes}</p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {record.treatmentPlan.referrals?.length > 0 && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">Referrals</h4>
                                <ul className="space-y-2">
                                  {record.treatmentPlan.referrals.map((ref, idx) => (
                                    <li key={idx} className="border-l-2 border-green-400 pl-2">
                                      <p className="font-medium">{ref.specialist}</p>
                                      <p className="text-sm">{ref.reason}</p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(ref.date).toLocaleDateString()}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {record.treatmentPlan.therapyPlans && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-700 mb-2">Therapy Plans</h4>
                                <p className="whitespace-pre-line">{record.treatmentPlan.therapyPlans}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Lab Results Content */}
                      {activeRecordTabs[record._id] === 'labs' && record.labResults?.length > 0 && (
                        <div className="p-4 bg-white">
                          <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normal Range</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {record.labResults.map((lab, idx) => (
                                  <tr key={idx} className={lab.status === 'reviewed' ? '' : 'bg-yellow-50'}>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium">{lab.testName}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lab.testValue}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{lab.normalRange || 'N/A'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{new Date(lab.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        lab.status === 'reviewed' 
                                          ? 'bg-green-100 text-green-800' 
                                          : lab.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {lab.status === 'reviewed' ? 'Reviewed' : lab.status === 'pending' ? 'Pending' : 'Completed'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {record.labResults.some(lab => lab.comments) && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-700 mb-2">Lab Notes</h4>
                              {record.labResults.filter(lab => lab.comments).map((lab, idx) => (
                                <div key={idx} className="p-3 bg-gray-50 rounded-lg mb-2">
                                  <p className="text-sm font-medium">{lab.testName}</p>
                                  <p className="text-sm">{lab.comments}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {record.labResults.some(lab => lab.reportUrl) && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-700 mb-2">Lab Reports</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {record.labResults.filter(lab => lab.reportUrl).map((lab, idx) => (
                                  <a 
                                    key={idx} 
                                    href={lab.reportUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {lab.testName} Report
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Medications Content */}
                      {activeRecordTabs[record._id] === 'medications' && record.medications?.length > 0 && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {record.medications.map((med, idx) => (
                              <div key={idx} className={`p-4 rounded-lg border ${med.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex justify-between items-start">
                                  <h4 className="font-medium text-lg">{med.name}</h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    med.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {med.isActive ? 'Active' : 'Discontinued'}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div>
                                    <p className="text-xs text-gray-500">Dosage</p>
                                    <p className="font-medium">{med.dosage}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Frequency</p>
                                    <p className="font-medium">{med.frequency}</p>
                                  </div>
                                  
                                  {med.administrationMethod && (
                                    <div>
                                      <p className="text-xs text-gray-500">Administration</p>
                                      <p className="font-medium">{med.administrationMethod}</p>
                                    </div>
                                  )}
                                  
                                  {med.startDate && (
                                    <div>
                                      <p className="text-xs text-gray-500">Start Date</p>
                                      <p className="font-medium">{new Date(med.startDate).toLocaleDateString()}</p>
                                    </div>
                                  )}
                                  
                                  {med.endDate && (
                                    <div>
                                      <p className="text-xs text-gray-500">End Date</p>
                                      <p className="font-medium">{new Date(med.endDate).toLocaleDateString()}</p>
                                    </div>
                                  )}
                                </div>
                                
                                {med.notes && (
                                  <div className="mt-3 pt-2 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                                    <p className="text-sm">{med.notes}</p>
                                  </div>
                                )}
                                
                                {med.adverseReactions?.length > 0 && (
                                  <div className="mt-3 pt-2 border-t">
                                    <p className="text-xs text-gray-500 mb-1">Adverse Reactions</p>
                                    <ul className="space-y-1">
                                      {med.adverseReactions.map((reaction, i) => (
                                        <li key={i} className="flex items-center text-sm p-1 border-l-2 border-red-300 pl-2">
                                          <span>{reaction.reaction}</span>
                                          <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                                            reaction.severity === 'severe' 
                                              ? 'bg-red-100 text-red-800' 
                                              : reaction.severity === 'moderate'
                                                ? 'bg-orange-100 text-orange-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {reaction.severity}
                                          </span>
                                          <span className="ml-2 text-xs text-gray-500">
                                            {new Date(reaction.reportedOn).toLocaleDateString()}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Imaging Content */}
                      {activeRecordTabs[record._id] === 'imaging' && record.imaging?.length > 0 && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {record.imaging.map((img, idx) => (
                              <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium">
                                    {img.type === 'xray' ? 'X-Ray' : 
                                     img.type === 'mri' ? 'MRI' : 
                                     img.type === 'ct' ? 'CT Scan' : 
                                     img.type === 'ultrasound' ? 'Ultrasound' : 
                                     'Other'} 
                                  </h4>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {img.bodyPart}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-500 mb-1">Date</p>
                                <p className="mb-3">{new Date(img.date).toLocaleDateString()}</p>
                                
                                {img.findings && (
                                  <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-1">Findings</p>
                                    <p className="text-sm bg-white p-2 rounded border border-gray-200">{img.findings}</p>
                                  </div>
                                )}
                                
                                {img.imageUrl && (
                                  <div className="mb-2">
                                    <a 
                                      href={getImageUrl(img.imageUrl)} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      View Image
                                    </a>
                                  </div>
                                )}
                                
                                {img.performedBy && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Performed by: {img.performedBy}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Medical Document</h2>
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
                <p className="mt-1 text-xs text-gray-500">Upload your medical documents to keep all your records in one place.</p>
              </div>
              
              <button
                type="submit"
                disabled={!file}
                className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none flex items-center ${
                  !file ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                </svg>
                Upload Document
              </button>
            </form>
            
            {/* Display Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-3">Uploaded Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {uploadedFiles.map((file, index) => (                    <div key={index} className="border rounded-lg overflow-hidden">                      {file.mimetype?.includes('image') ? (                        <div className="h-32 bg-gray-100">                          <img                             src={debugImageUrl(getImageUrl(file.filename), 'uploaded file')}                             alt={file.originalname}                             className="w-full h-full object-contain"                            onError={(e) => {                              e.target.onerror = null;                              e.target.src = "https://via.placeholder.com/150?text=Image+Not+Found";                              console.error("Failed to load image:", file.filename);                            }}                          />                        </div>                      ) : (                        <div className="h-32 bg-gray-100 flex items-center justify-center">                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />                          </svg>                        </div>                      )}                      <div className="p-2">                        <p className="text-sm font-medium truncate">{file.originalname}</p>                        <p className="text-xs text-gray-500">{new Date(file.createdAt).toLocaleDateString()}</p>                        <a                           href={debugImageUrl(getImageUrl(file.filename), 'document link')}                           target="_blank"                           rel="noopener noreferrer"                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"                          onClick={(e) => {                            console.log('Opening document:', getImageUrl(file.filename));                          }}                        >                          View Document                        </a>                      </div>                    </div>                  ))}
                </div>
              </div>
            )}
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
                <p className="mt-1 text-xs text-gray-500">
                  {doctors.length === 0 
                    ? "No doctors are available in the system. Please try again later." 
                    : "All available doctors are shown. Appointment requests will be confirmed by doctors."}
                </p>
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
              {/* Profile Photo Upload */}
              <div className="mb-6 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-gray-300 mb-3">
                  {personalInfo.profilePhoto ? (
                    <img 
                      src={debugImageUrl(getImageUrl(personalInfo.profilePhoto), 'profile edit')} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/150?text=Profile";
                        console.error("Failed to load profile photo");
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <label className="cursor-pointer bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePhotoChange}
                  />
                  Change Photo
                </label>
              </div>
              
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
              <div className="flex flex-col md:flex-row items-start md:items-center mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300 mr-6 mb-4 md:mb-0 flex-shrink-0">
                  {patientInfo?.profilePhoto ? (
                    <img 
                      src={debugImageUrl(getImageUrl(patientInfo.profilePhoto), 'profile info')} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/150?text=Profile";
                        console.error("Failed to load profile photo in info section");
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Current Information</h2>
                  <p className="text-sm text-gray-500 mt-1">Your personal and account details</p>
                </div>
              </div>
              
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
                <div>
                  <p className="text-gray-600">Patient ID</p>
                  <p className="font-medium font-mono">{patientInfo?._id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Access Code</p>
                  <p className="font-medium font-mono bg-gray-100 px-2 py-1 rounded">{patientInfo?.accessCode || 'N/A'}</p>
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
                          Access level: {grant.accessLevel === 'readWrite' ? 
                            'Full Access (read & write)' : 
                            'Read Only (limited access)'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(grant.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleRevokeAccess(grant.doctorId._id, grant.accessLevel)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none h-fit"
                      >
                        {grant.accessLevel === 'readWrite' ? 'Restrict Access' : 'Revoke Access'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {/* Medical Documents Tab */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Upload Form */}
          <div className="col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Upload Medical Document</h2>
            <form onSubmit={handleDocumentUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                  value={documentUploadForm.documentType}
                  onChange={(e) => setDocumentUploadForm({ ...documentUploadForm, documentType: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                >
                  <option value="Lab Report">Lab Report</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Scan Report">Scan Report</option>
                  <option value="Insurance">Insurance Document</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={documentUploadForm.description}
                  onChange={(e) => setDocumentUploadForm({ ...documentUploadForm, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Document description"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Document File</label>
                <input
                  type="file"
                  onChange={handleDocumentFileChange}
                  className="w-full p-2 border border-gray-300 rounded"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Accepted formats: PDF, JPG, PNG. Maximum file size: 10MB
                </p>
              </div>
              
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none disabled:bg-blue-300"
                disabled={fileUploadLoading}
              >
                {fileUploadLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : "Upload Document"}
              </button>
            </form>
            
            {selectedDocument && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-md font-semibold mb-3">Edit Selected Document</h3>
                <form onSubmit={handleUpdateDocument}>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Document Type</label>
                    <select
                      value={documentUpdateForm.documentType}
                      onChange={(e) => setDocumentUpdateForm({ ...documentUpdateForm, documentType: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded"
                      required
                    >
                      <option value="Lab Report">Lab Report</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Scan Report">Scan Report</option>
                      <option value="Insurance">Insurance Document</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={documentUpdateForm.description}
                      onChange={(e) => setDocumentUpdateForm({ ...documentUpdateForm, description: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Document description"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 focus:outline-none text-sm"
                    >
                      Update Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(selectedDocument._id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 focus:outline-none text-sm"
                    >
                      Delete Document
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          {/* Document List */}
          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">My Medical Documents</h2>
            
            {medicalDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicalDocuments.map(document => (
                  <div 
                    key={document._id} 
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedDocument && selectedDocument._id === document._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleSelectDocument(document)}
                  >
                    <div className="flex items-center mb-2">
                      {getDocumentIcon(document.mimetype)}
                      <div className="ml-3">
                        <h3 className="font-medium truncate">{document.originalname}</h3>
                        <p className="text-sm text-gray-500 truncate">{document.documentType}</p>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p className="mb-1 truncate">
                        <span className="font-medium">Description:</span> {document.description || 'No description'}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Size:</span> {Math.round(document.size / 1024)} KB
                      </p>
                      <p>
                        <span className="font-medium">Uploaded:</span> {new Date(document.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="mt-2 flex space-x-2">
                      <a 
                        href={getImageUrl(document._id)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Document
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(document._id);
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No medical documents uploaded yet</p>
                <p className="text-sm text-gray-400">Upload your medical documents to keep track of your health records</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard; 