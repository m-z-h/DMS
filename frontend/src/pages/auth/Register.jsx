import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Register = () => {
  const [role, setRole] = useState('Doctor');
  const [adminExists, setAdminExists] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    contactNo: '',
    hospitalCode: '',
    departmentCode: '',
    licenseNo: '',
    employeeId: '',
    specialization: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isHospitalSelected, setIsHospitalSelected] = useState(false);
  const [hospitalEmailDomain, setHospitalEmailDomain] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  // Hardcoded API URL for production
  const apiUrl = 'https://dms-o3zx.vercel.app/api';
  
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
    setSuccessMessage('');
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
    } else if (role === 'Receptionist') {
      if (!formData.hospitalCode || !formData.contactNo) {
        setError('Hospital and contact number are required for receptionists');
        setIsLoading(false);
        return;
      }
      
      // Receptionist email validation (should be from hospital domain)
      const emailDomain = formData.email.split('@')[1];
      
      if (!emailDomain || emailDomain.toLowerCase() !== hospitalEmailDomain.toLowerCase()) {
        setError(`Receptionists must register with the hospital's email domain: @${hospitalEmailDomain}`);
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
        contactNo: formData.contactNo,
        hospitalCode: formData.hospitalCode,
        // Role-specific fields
        ...(role === 'Doctor' && {
          departmentCode: formData.departmentCode,
          licenseNo: formData.licenseNo,
          specialization: formData.specialization || ''
        })
      };

      const response = await axios.post(`${apiUrl}/auth/register`, registrationData);
      
      if (response.data.success) {
        setSuccessMessage('Registration successful! Your account is pending approval by an administrator.');
        // Reset form after successful registration
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          contactNo: '',
          hospitalCode: '',
          departmentCode: '',
          licenseNo: '',
          employeeId: '',
          specialization: ''
        });
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Healthcare Professional Registration
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Register as:
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="Doctor"
                  checked={role === 'Doctor'}
                  onChange={handleRoleChange}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-gray-700">Doctor</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="Receptionist"
                  checked={role === 'Receptionist'}
                  onChange={handleRoleChange}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-gray-700">Receptionist</span>
              </label>
            </div>
          </div>
          
          {/* Account Information */}
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Account Information</h3>
          
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
              {hospitalEmailDomain && (
                <span className="ml-1 text-blue-600 text-xs">
                  (must be @{hospitalEmailDomain})
                </span>
              )}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={hospitalEmailDomain ? `your.name@${hospitalEmailDomain}` : "your@email.com"}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                minLength="6"
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
          
          {/* Personal Information */}
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2 mt-6">Personal Information</h3>
          
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
          
          {/* Hospital and Department */}
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2 mt-6">Professional Information</h3>
          
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
          
          {/* Doctor-specific fields */}
          {role === 'Doctor' && (
            <>
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isHospitalSelected ? 'bg-gray-100' : ''}`}
                >
                  <option value="">Select Department</option>
                  {departments.map(department => (
                    <option key={department.code} value={department.code}>
                      {department.name}
                    </option>
                  ))}
                </select>
                {!isHospitalSelected && (
                  <p className="text-gray-500 text-xs mt-1">Select a hospital first</p>
                )}
              </div>
              
              <div className="mb-4">
                <label htmlFor="licenseNo" className="block text-gray-700 text-sm font-bold mb-2">
                  Medical License Number
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
                <label htmlFor="specialization" className="block text-gray-700 text-sm font-bold mb-2">
                  Specialization (Optional)
                </label>
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          
          {/* Receptionist-specific fields */}
          {role === 'Receptionist' && (
            <></>
          )}
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Note: Patients can only be registered by hospital receptionists
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register; 