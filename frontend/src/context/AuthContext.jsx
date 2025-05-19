import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API base URL from environment variable or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Configure axios with credentials
  axios.defaults.withCredentials = true;

  // Check if user is logged in on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        
        if (!storedToken) {
          setLoading(false);
          return;
        }
        
        setToken(storedToken);
        
        const res = await axios.get(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });
        
        if (res.data.success) {
          setUser(res.data.data.user);
          setRole(res.data.data.user.role);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, [apiUrl]);

  // Register user
  const register = async (formData) => {
    try {
      setError(null);
      const res = await axios.post(`${apiUrl}/auth/register`, formData);
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(formData);
        setRole(res.data.role);
        
        return {
          success: true,
          data: res.data,
          message: 'Registration successful'
        };
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed'
      };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post(`${apiUrl}/auth/login`, { email, password });
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        
        try {
          // Fetch user data after login
          const userRes = await axios.get(`${apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${res.data.token}`
            }
          });
          
          if (userRes.data.success) {
            setUser(userRes.data.data.user);
            setRole(userRes.data.data.user.role);
          }
        } catch (userError) {
          console.error('Error fetching user details:', userError);
          // Continue with login even if user details fetch fails
        }
        
        return {
          success: true,
          role: res.data.role,
          message: 'Login successful'
        };
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                          (err.message === 'Network Error' ? 'Cannot connect to server' : 'Login failed');
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  // Context value
  const value = {
    user,
    role,
    token,
    loading,
    error,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 