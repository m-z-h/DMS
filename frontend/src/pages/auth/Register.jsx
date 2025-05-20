import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Register = () => {
  const [role, setRole] = useState('Patient');
  const [adminExists, setAdminExists] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    contactNo: '',
    dateOfBirth: '',
    address: '',
    hospitalCode: '',
    departmentCode: '',
    licenseNo: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfData, setPdfData] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [isHospitalSelected, setIsHospitalSelected] = useState(false);
  const [hospitalEmailDomain, setHospitalEmailDomain] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  
  // Check if admin exists and fetch hospitals and departments
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const res = await axios.get(`${apiUrl}/auth/check-admin-exists`);
        setAdminExists(res.data.exists);
      } catch (error) {
        // Fallback - assume admin exists if we can't check
        console.error("Error checking admin:", error);
        setAdminExists(false);
      }
    };

    const fetchHospitalsAndDepartments = async () => {
      try {
        // Define the URLs to use
        const hospitalsUrl = `${apiUrl}/auth/hospitals`;
        
        console.log('Fetching hospitals from:', hospitalsUrl);
        
        const hospitalsRes = await axios.get(hospitalsUrl);
        
        if (hospitalsRes.data.success) {
          console.log('Successfully fetched hospitals:', hospitalsRes.data);
          setHospitals(hospitalsRes.data.data || []);
        }
        
        // We'll fetch departments only when a hospital is selected
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        console.error("Request URL:", error.config?.url);
        
        // Set fallback mock data if API fails
        setHospitals([
          { code: 'MH1', name: 'Manipal Hospital', emailDomain: 'manipal.com' },
          { code: 'AH2', name: 'Apollo Hospital', emailDomain: 'apollo.com' },
          { code: 'FH3', name: 'Fortis Hospital', emailDomain: 'fortis.com' },
          { code: 'MH4', name: 'Max Healthcare', emailDomain: 'maxhealthcare.com' },
          { code: 'AIIMS5', name: 'AIIMS', emailDomain: 'aiims.edu' }
        ]);
      }
    };
    
    checkAdminExists();
    fetchHospitalsAndDepartments();
  }, [apiUrl]);
  
  const handleRoleChange = (e) => {
    setRole(e.target.value);
    // Reset hospital and department selections when role changes
    setFormData({
      ...formData,
      hospitalCode: '',
      departmentCode: ''
    });
    setIsHospitalSelected(false);
    setHospitalEmailDomain('');
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // When hospital changes, update department options and email domain
    if (name === 'hospitalCode') {
      setFormData({ 
        ...formData, 
        hospitalCode: value,
        departmentCode: '' // Reset department when hospital changes
      });
      
      // Enable or disable department dropdown based on hospital selection
      setIsHospitalSelected(!!value);
      
      // Get the selected hospital's email domain
      if (value) {
        const selectedHospital = hospitals.find(h => h.code === value);
        if (selectedHospital && selectedHospital.emailDomain) {
          setHospitalEmailDomain(selectedHospital.emailDomain);
        } else {
          setHospitalEmailDomain('');
        }
        
        // Fetch departments for this specific hospital
        fetchDepartmentsForHospital(value);
      } else {
        setHospitalEmailDomain('');
      }
    }
  };
  
  // Function to fetch departments for a specific hospital
  const fetchDepartmentsForHospital = async (hospitalCode) => {
    try {
      console.log(`Fetching departments for hospital: ${hospitalCode}`);
      const departmentsUrl = `${apiUrl}/auth/departments?hospitalCode=${hospitalCode}`;
      
      const response = await axios.get(departmentsUrl);
      
      if (response.data.success) {
        console.log('Successfully fetched hospital-specific departments:', response.data.data);
        setDepartments(response.data.data || []);
      } else {
        console.error('Failed to fetch departments for hospital:', response.data.message);
        setDepartments([]); // Empty the departments if none found
      }
    } catch (error) {
      console.error(`Error fetching departments for hospital ${hospitalCode}:`, error);
      setDepartments([]); // Empty the departments on error
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Password validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    // Role-specific validation
    if (role === 'Doctor') {
      if (!formData.hospitalCode || !formData.departmentCode || !formData.licenseNo) {
        setError('Hospital, department, and license number are required for doctors');
        setIsLoading(false);
        return;
      }
      
      // Doctor email validation (should be from hospital domain)
      const emailDomain = formData.email.split('@')[1];
      
      if (!emailDomain || emailDomain.toLowerCase() !== hospitalEmailDomain.toLowerCase()) {
        setError(`Doctors must register with the hospital's email domain: @${hospitalEmailDomain}`);
        setIsLoading(false);
        return;
      }
    } else if (role === 'Patient') {
      if (!formData.dateOfBirth || !formData.contactNo || !formData.address) {
        setError('Date of birth, contact number, and address are required for patients');
        setIsLoading(false);
        return;
      }
    }
    
    try {
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role,
        fullName: formData.fullName,
        // Role-specific fields
        ...(role === 'Doctor' && {
          hospitalCode: formData.hospitalCode,
          departmentCode: formData.departmentCode,
          licenseNo: formData.licenseNo,
          contactNo: formData.contactNo
        }),
        ...(role === 'Patient' && {
          dateOfBirth: formData.dateOfBirth,
          contactNo: formData.contactNo,
          address: formData.address
        })
      };
      
      const result = await register(registrationData);
      
      if (result.success) {
        if (role === 'Patient' && result.data.pdfData) {
          // Store PDF data for download
          setPdfData(result.data.pdfData);
          // Don't navigate away - let user download their PDF first
        } else {
          // Redirect based on role
          if (role === 'Admin') {
            navigate('/admin/dashboard');
          } else if (role === 'Doctor') {
            navigate('/doctor/dashboard');
          } else {
            navigate('/patient/dashboard');
          }
        }
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadPDF = () => {
    if (!pdfData) return;
    
    // Create a Blob from the base64 PDF data
    const binaryData = atob(pdfData);
    const array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      array[i] = binaryData.charCodeAt(i);
    }
    const blob = new Blob([array], { type: 'application/pdf' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'patient_credentials.pdf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // After download, redirect to dashboard
    navigate('/patient/dashboard');
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Register Account
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {pdfData ? (
          <div className="text-center">
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md">
              <p className="font-bold">Registration Successful!</p>
              <p className="mt-2">
                Your account has been created. Please download your credentials PDF for important information.
              </p>
            </div>
            
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none"
            >
              Download Credentials PDF
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Register As
              </label>
              <div className="flex space-x-4">
                {/* Only show Admin option if admin doesn't exist */}
                {!adminExists && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="Admin"
                      checked={role === 'Admin'}
                      onChange={handleRoleChange}
                      className="mr-2"
                    />
                    <span>Admin</span>
                  </label>
                )}
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Doctor"
                    checked={role === 'Doctor'}
                    onChange={handleRoleChange}
                    className="mr-2"
                  />
                  <span>Doctor</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Patient"
                    checked={role === 'Patient'}
                    onChange={handleRoleChange}
                    className="mr-2"
                  />
                  <span>Patient</span>
                </label>
              </div>
            </div>
            
            {/* Common Fields */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="fullName" className="block text-gray-700 text-sm font-bold mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Doctor-specific fields */}
            {role === 'Doctor' && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="hospitalCode" className="block text-gray-700 text-sm font-bold mb-2">
                      Hospital
                    </label>
                    <select
                      id="hospitalCode"
                      name="hospitalCode"
                      value={formData.hospitalCode}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Hospital</option>
                      {hospitals.map(hospital => (
                        <option key={hospital.code} value={hospital.code}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="departmentCode" className="block text-gray-700 text-sm font-bold mb-2">
                      Department
                    </label>
                    <select
                      id="departmentCode"
                      name="departmentCode"
                      value={formData.departmentCode}
                      onChange={handleChange}
                      required
                      disabled={!isHospitalSelected}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isHospitalSelected ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.code} value={dept.code}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {!isHospitalSelected && (
                      <p className="mt-1 text-xs text-gray-500">
                        Select a hospital first
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label htmlFor="licenseNo" className="block text-gray-700 text-sm font-bold mb-2">
                      License Number
                    </label>
                    <input
                      type="text"
                      id="licenseNo"
                      name="licenseNo"
                      value={formData.licenseNo}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="contactNo" className="block text-gray-700 text-sm font-bold mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contactNo"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md text-sm">
                  <p className="font-semibold">Note:</p>
                  {hospitalEmailDomain ? (
                    <p>Doctors must register with the hospital's email domain: @{hospitalEmailDomain}</p>
                  ) : (
                    <p>Please select a hospital to see the required email domain for registration.</p>
                  )}
                </div>
              </>
            )}
            
            {/* Patient-specific fields */}
            {role === 'Patient' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label htmlFor="dateOfBirth" className="block text-gray-700 text-sm font-bold mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="contactNo" className="block text-gray-700 text-sm font-bold mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    id="contactNo"
                    name="contactNo"
                    value={formData.contactNo}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4 md:col-span-2">
                  <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  ></textarea>
                </div>
                
                <div className="mb-4 md:col-span-2 p-3 bg-yellow-100 text-yellow-700 rounded-md text-sm">
                  <p className="font-semibold">Note:</p>
                  <p>After registration, you will receive a PDF with your login credentials and a unique access code. 
                     Keep this information secure - doctors will need your access code to view your medical records.</p>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Processing...' : 'Register'}
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 