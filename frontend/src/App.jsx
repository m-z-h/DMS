import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import DoctorDashboard from './pages/dashboard/DoctorDashboard';
import PatientDashboard from './pages/dashboard/PatientDashboard';
import ReceptionistDashboard from './pages/dashboard/ReceptionistDashboard';
import NotFound from './pages/NotFound';

function App() {
  const { loading, role, user } = useAuth();
  
  // Add debug logs
  console.log('App rendering with:', { 
    loading, 
    role,
    isAuthenticated: !!user,
    userDetails: user ? {
      id: user.id,
      username: user.username,
      role: user.role
    } : null
  });

  if (loading) {
    console.log('App is in loading state');
    // You could create a nice loading component here
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Login />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        {/* Protected Routes */}
        <Route 
          element={<ProtectedRoute allowedRoles={['Admin']} />} 
          path="admin/dashboard" 
        >
          <Route index element={<AdminDashboard />} />
        </Route>

        <Route 
          element={<ProtectedRoute allowedRoles={['Doctor']} />}
          path="doctor/dashboard"
        >
          <Route index element={<DoctorDashboard />} />
        </Route>

        <Route 
          element={<ProtectedRoute allowedRoles={['Patient']} />}
          path="patient/dashboard"
        >
          <Route index element={<PatientDashboard />} />
        </Route>

        <Route 
          element={<ProtectedRoute allowedRoles={['Receptionist']} />}
          path="receptionist/dashboard"
        >
          <Route index element={<ReceptionistDashboard />} />
        </Route>

        {/* 404 - Not Found */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
