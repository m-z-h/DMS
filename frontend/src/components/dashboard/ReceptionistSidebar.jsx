import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FaHome, 
  FaUserPlus, 
  FaCalendarAlt, 
  FaUsers, 
  FaSignOutAlt, 
  FaHospital,
  FaUserMd,
  FaUser
} from 'react-icons/fa';

const ReceptionistSidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname.includes(path) || location.search.includes(path);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="bg-blue-800 text-white w-64 flex-shrink-0 min-h-screen shadow-lg hidden md:block">
      <div className="p-4 border-b border-blue-900 flex items-center">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
          <FaHospital className="text-blue-800 text-lg" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Medical DMS</h2>
          <p className="text-xs text-blue-300">Receptionist Portal</p>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center mr-3">
              <span className="text-lg font-bold">
                {user?.fullName?.charAt(0) || 'R'}
              </span>
            </div>
            <div>
              <p className="font-medium">{user?.fullName || 'Receptionist'}</p>
              <p className="text-xs text-blue-300">{user?.email || ''}</p>
            </div>
          </div>
          {user?.hospitalCode && (
            <div className="bg-blue-900 rounded-md p-2 text-xs">
              <span className="text-blue-300">Hospital:</span> 
              <span className="ml-1 text-white">{user.hospitalCode}</span>
            </div>
          )}
        </div>

        <p className="text-xs uppercase font-semibold text-blue-400 tracking-wider mb-3">Main Navigation</p>
        <nav className="space-y-2">
          <Link
            to="/receptionist/dashboard"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('/dashboard') && !isActive('tab=') ? 'bg-blue-700' : ''
            }`}
          >
            <FaHome className="mr-3 text-blue-300" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/receptionist/dashboard?tab=register-patient"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('tab=register-patient') ? 'bg-blue-700' : ''
            }`}
          >
            <FaUserPlus className="mr-3 text-blue-300" />
            <span>Register Patient</span>
          </Link>

          <Link
            to="/receptionist/dashboard?tab=schedule-appointment"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('tab=schedule-appointment') ? 'bg-blue-700' : ''
            }`}
          >
            <FaCalendarAlt className="mr-3 text-blue-300" />
            <span>Schedule Appointment</span>
          </Link>

          <Link
            to="/receptionist/dashboard?tab=manage-patients"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('tab=manage-patients') ? 'bg-blue-700' : ''
            }`}
          >
            <FaUsers className="mr-3 text-blue-300" />
            <span>Manage Patients</span>
          </Link>

          <Link
            to="/receptionist/doctors"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('/doctors') ? 'bg-blue-700' : ''
            }`}
          >
            <FaUserMd className="mr-3 text-blue-300" />
            <span>Manage Doctors</span>
          </Link>
          
          <Link
            to="/receptionist/profile"
            className={`flex items-center px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors ${
              isActive('/profile') ? 'bg-blue-700' : ''
            }`}
          >
            <FaUser className="mr-3 text-blue-300" />
            <span>My Profile</span>
          </Link>
        </nav>
      </div>

      <div className="absolute bottom-0 w-64 p-4 border-t border-blue-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-left rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaSignOutAlt className="mr-3 text-blue-300" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default ReceptionistSidebar; 