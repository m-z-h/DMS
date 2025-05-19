const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold">Medical Data Management System</h2>
            <p className="text-sm text-gray-300 mt-1">
              Secure medical records management with advanced encryption
            </p>
          </div>
          
          <div className="text-sm text-gray-300">
            &copy; {new Date().getFullYear()} - All rights reserved
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 