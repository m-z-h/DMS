import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold">
            Medical DMS
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm">
                Welcome, {role === 'Admin' ? 'Admin' : user.username}
              </span>
              
              {role === 'Admin' && (
                <Link 
                  to="/admin/dashboard" 
                  className="px-3 py-2 text-sm rounded hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              )}
              
              {role === 'Doctor' && (
                <Link 
                  to="/doctor/dashboard" 
                  className="px-3 py-2 text-sm rounded hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              )}
              
              {role === 'Patient' && (
                <Link 
                  to="/patient/dashboard" 
                  className="px-3 py-2 text-sm rounded hover:bg-blue-700"
                >
                  Dashboard
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="px-3 py-2 text-sm rounded hover:bg-blue-700"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-3 py-2 text-sm bg-green-600 rounded hover:bg-green-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 