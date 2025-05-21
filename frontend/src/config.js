// Configuration for API URLs based on environment
const config = {
  // Backend API base URL
  API_URL: import.meta.env.PROD
    ? 'https://dms-backend-bay.vercel.app/api' 
    : 'http://localhost:5000/api',
  
  // File uploads URL
  UPLOADS_URL: import.meta.env.PROD
    ? 'https://dms-backend-bay.vercel.app/uploads'
    : 'http://localhost:5000/uploads'
};

export default config; 