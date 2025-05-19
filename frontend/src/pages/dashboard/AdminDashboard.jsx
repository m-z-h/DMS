import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState({
    analytics: false,
    users: false,
    auditLogs: false
  });
  const [pagination, setPagination] = useState({
    users: { page: 1, totalPages: 1 },
    auditLogs: { page: 1, totalPages: 1 }
  });
  const [filters, setFilters] = useState({
    users: { role: '', active: '' },
    auditLogs: { 
      entityType: '', 
      action: '',
      startDate: '',
      endDate: ''
    }
  });
  
  // Configure axios with base URL and token
  const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  // Recreate apiClient when token changes
  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  // Load analytics data
  useEffect(() => {
    if (activeTab === 'analytics' && token) {
      fetchAnalytics();
    }
  }, [activeTab, token]);

  // Load users data
  useEffect(() => {
    if (activeTab === 'users' && token) {
      fetchUsers();
    }
  }, [activeTab, pagination.users.page, filters.users, token]);

  // Load audit logs data
  useEffect(() => {
    if (activeTab === 'auditLogs' && token) {
      fetchAuditLogs();
    }
  }, [activeTab, pagination.auditLogs.page, filters.auditLogs, token]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      const res = await apiClient.get('/admin/analytics');
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  // Fetch users data with pagination and filters
  const fetchUsers = async () => {
    setLoading(prev => ({ ...prev, users: true }));
    try {
      const { page } = pagination.users;
      const { role, active } = filters.users;
      
      let url = `/admin/users?page=${page}&limit=10`;
      if (role) url += `&role=${role}`;
      if (active !== '') url += `&active=${active}`;
      
      const res = await apiClient.get(url);
      
      setUsers(res.data.data);
      setPagination(prev => ({
        ...prev,
        users: {
          page: res.data.currentPage,
          totalPages: res.data.totalPages
        }
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Fetch audit logs with pagination and filters
  const fetchAuditLogs = async () => {
    setLoading(prev => ({ ...prev, auditLogs: true }));
    try {
      const { page } = pagination.auditLogs;
      const { entityType, action, startDate, endDate } = filters.auditLogs;
      
      let url = `/admin/audit-logs?page=${page}&limit=20`;
      if (entityType) url += `&entityType=${entityType}`;
      if (action) url += `&action=${action}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      
      const res = await apiClient.get(url);
      
      setAuditLogs(res.data.data);
      setPagination(prev => ({
        ...prev,
        auditLogs: {
          page: res.data.currentPage,
          totalPages: res.data.totalPages
        }
      }));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(prev => ({ ...prev, auditLogs: false }));
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/status`);
      
      // Update user in the list without refetching
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, active: !currentStatus } 
          : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      
      // Remove user from the list
      setUsers(users.filter(user => user._id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // Handle page change for pagination
  const handlePageChange = (tab, newPage) => {
    if (newPage < 1 || newPage > pagination[tab].totalPages) return;
    
    setPagination(prev => ({
      ...prev,
      [tab]: { ...prev[tab], page: newPage }
    }));
  };

  // Update filters
  const handleFilterChange = (tab, field, value) => {
    setFilters(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [field]: value }
    }));
    
    // Reset to page 1 when filter changes
    setPagination(prev => ({
      ...prev,
      [tab]: { ...prev[tab], page: 1 }
    }));
  };

  // Render analytics tab content
  const renderAnalyticsTab = () => {
    if (loading.analytics) {
      return <div className="text-center py-10">Loading analytics data...</div>;
    }

    if (!analytics) {
      return <div className="text-center py-10">No analytics data available</div>;
    }

    // Prepare chart data
    const roleData = {
      labels: Object.keys(analytics.users.roleDistribution || {}),
      datasets: [
        {
          label: 'Users by Role',
          data: Object.values(analytics.users.roleDistribution || {}),
          backgroundColor: [
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 99, 132, 0.5)',
            'rgba(255, 206, 86, 0.5)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };

    const entitiesData = {
      labels: Object.keys(analytics.entities || {}),
      datasets: [
        {
          label: 'Entity Counts',
          data: Object.values(analytics.entities || {}),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.users.total}</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-500 mr-2">{analytics.users.active}</span>
              <span className="text-gray-500">Active</span>
              <span className="mx-2">|</span>
              <span className="text-red-500 mr-2">{analytics.users.inactive}</span>
              <span className="text-gray-500">Inactive</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.entities.patients}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Doctors</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.entities.doctors}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Hospitals</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.entities.hospitals}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Departments</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.entities.departments}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Appointments</h3>
            <p className="text-3xl font-bold text-gray-700">{analytics.entities.appointments}</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">User Distribution by Role</h3>
            <div className="h-64">
              <Pie data={roleData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Entity Counts</h3>
            <div className="h-64">
              <Bar data={entitiesData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render users tab content
  const renderUsersTab = () => {
    if (loading.users) {
      return <div className="text-center py-10">Loading users...</div>;
    }

    return (
      <div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.users.role}
              onChange={(e) => handleFilterChange('users', 'role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Doctor">Doctor</option>
              <option value="Patient">Patient</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.users.active}
              onChange={(e) => handleFilterChange('users', 'active', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          
          <div className="ml-auto flex items-end">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg"
              onClick={() => fetchUsers()}
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Users table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                          user.role === 'Doctor' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(user._id, user.active)}
                        className={`mr-2 px-3 py-1 rounded ${
                          user.active 
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange('users', pagination.users.page - 1)}
                disabled={pagination.users.page <= 1}
                className={`${pagination.users.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange('users', pagination.users.page + 1)}
                disabled={pagination.users.page >= pagination.users.totalPages}
                className={`${pagination.users.page >= pagination.users.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.users.page}</span> of <span className="font-medium">{pagination.users.totalPages}</span>
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange('users', 1)}
                    disabled={pagination.users.page <= 1}
                    className={`${pagination.users.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange('users', pagination.users.page - 1)}
                    disabled={pagination.users.page <= 1}
                    className={`${pagination.users.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">{pagination.users.page} / {pagination.users.totalPages}</span>
                  <button
                    onClick={() => handlePageChange('users', pagination.users.page + 1)}
                    disabled={pagination.users.page >= pagination.users.totalPages}
                    className={`${pagination.users.page >= pagination.users.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange('users', pagination.users.totalPages)}
                    disabled={pagination.users.page >= pagination.users.totalPages}
                    className={`${pagination.users.page >= pagination.users.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render audit logs tab content
  const renderAuditLogsTab = () => {
    if (loading.auditLogs) {
      return <div className="text-center py-10">Loading audit logs...</div>;
    }

    return (
      <div>
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.auditLogs.entityType}
              onChange={(e) => handleFilterChange('auditLogs', 'entityType', e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="USER">User</option>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="HOSPITAL">Hospital</option>
              <option value="DEPARTMENT">Department</option>
              <option value="MEDICAL_RECORD">Medical Record</option>
              <option value="APPOINTMENT">Appointment</option>
              <option value="FILE">File</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.auditLogs.action}
              onChange={(e) => handleFilterChange('auditLogs', 'action', e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="READ">Read</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.auditLogs.startDate}
              onChange={(e) => handleFilterChange('auditLogs', 'startDate', e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
              value={filters.auditLogs.endDate}
              onChange={(e) => handleFilterChange('auditLogs', 'endDate', e.target.value)}
            />
          </div>
          
          <div className="ml-auto flex items-end">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-lg"
              onClick={() => fetchAuditLogs()}
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Audit logs table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.action === 'CREATE' ? 'bg-green-100 text-green-800' : 
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800' : 
                          log.action === 'LOGIN' ? 'bg-purple-100 text-purple-800' : 
                          log.action === 'LOGOUT' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.entityType}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {log.description}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">No audit logs found</td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange('auditLogs', pagination.auditLogs.page - 1)}
                disabled={pagination.auditLogs.page <= 1}
                className={`${pagination.auditLogs.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange('auditLogs', pagination.auditLogs.page + 1)}
                disabled={pagination.auditLogs.page >= pagination.auditLogs.totalPages}
                className={`${pagination.auditLogs.page >= pagination.auditLogs.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{pagination.auditLogs.page}</span> of <span className="font-medium">{pagination.auditLogs.totalPages}</span>
                </p>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange('auditLogs', 1)}
                    disabled={pagination.auditLogs.page <= 1}
                    className={`${pagination.auditLogs.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange('auditLogs', pagination.auditLogs.page - 1)}
                    disabled={pagination.auditLogs.page <= 1}
                    className={`${pagination.auditLogs.page <= 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2">{pagination.auditLogs.page} / {pagination.auditLogs.totalPages}</span>
                  <button
                    onClick={() => handlePageChange('auditLogs', pagination.auditLogs.page + 1)}
                    disabled={pagination.auditLogs.page >= pagination.auditLogs.totalPages}
                    className={`${pagination.auditLogs.page >= pagination.auditLogs.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange('auditLogs', pagination.auditLogs.totalPages)}
                    disabled={pagination.auditLogs.page >= pagination.auditLogs.totalPages}
                    className={`${pagination.auditLogs.page >= pagination.auditLogs.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-md`}
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2" onClick={() => setActiveTab('analytics')}>
            <button 
              className={`inline-block py-3 px-4 border-b-2 rounded-t-lg ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'}`}>
              Analytics
            </button>
          </li>
          <li className="mr-2" onClick={() => setActiveTab('users')}>
            <button 
              className={`inline-block py-3 px-4 border-b-2 rounded-t-lg ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'}`}>
              User Management
            </button>
          </li>
          <li className="mr-2" onClick={() => setActiveTab('auditLogs')}>
            <button 
              className={`inline-block py-3 px-4 border-b-2 rounded-t-lg ${activeTab === 'auditLogs' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'}`}>
              Audit Logs
            </button>
          </li>
        </ul>
      </div>
      
      {/* Tab content */}
      {activeTab === 'analytics' && renderAnalyticsTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'auditLogs' && renderAuditLogsTab()}
    </div>
  );
};

export default AdminDashboard; 