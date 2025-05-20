import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();
  
  console.log('ProtectedRoute evaluation:', {
    allowedRoles,
    currentRole: role,
    isAuthenticated: !!user,
    isLoading: loading
  });

  // If still loading, show nothing
  if (loading) {
    console.log('Auth is still loading, showing nothing');
    return null;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    console.log('User is not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If user's role is not in the allowed roles, redirect to appropriate dashboard
  if (!allowedRoles.includes(role)) {
    console.log(`User role ${role} not in allowed roles ${allowedRoles.join(', ')}, redirecting`);
    
    // Redirect based on user role
    if (role === 'Admin') {
      console.log('Redirecting to admin dashboard');
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'Doctor') {
      console.log('Redirecting to doctor dashboard');
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (role === 'Patient') {
      console.log('Redirecting to patient dashboard');
      return <Navigate to="/patient/dashboard" replace />;
    } else if (role === 'Receptionist') {
      console.log('Redirecting to receptionist dashboard');
      return <Navigate to="/receptionist/dashboard" replace />;
    } else {
      // Fallback to login if role is undefined or not recognized
      console.log('Unknown role, redirecting to login');
      return <Navigate to="/login" replace />;
    }
  }

  // If user is authenticated and has the allowed role, render the child routes
  console.log(`User authorized with role ${role}, rendering protected content`);
  return <Outlet />;
};

export default ProtectedRoute; 