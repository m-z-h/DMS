import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

  // If still loading, show nothing
  if (loading) {
    return null;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user's role is not in the allowed roles, redirect to appropriate dashboard
  if (!allowedRoles.includes(role)) {
    // Redirect based on user role
    if (role === 'Admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'Doctor') {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (role === 'Patient') {
      return <Navigate to="/patient/dashboard" replace />;
    } else {
      // Fallback to login if role is undefined or not recognized
      return <Navigate to="/login" replace />;
    }
  }

  // If user is authenticated and has the allowed role, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 