import React from 'react';

const RegisterPatientSuccessModal = ({ isOpen, onClose, patientData }) => {
  if (!isOpen || !patientData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Patient Registered Successfully</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                Patient has been registered successfully.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Patient Information</h4>
          <div className="bg-gray-50 p-4 rounded-md space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{patientData.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Department:</span>
              <span className="font-medium">{patientData.departmentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contact:</span>
              <span className="font-medium">{patientData.contactNo}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Login Credentials</h4>
          <div className="bg-blue-50 p-4 rounded-md space-y-2 border border-blue-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Username:</span>
              <span className="font-medium font-mono">{patientData.credentials.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Password:</span>
              <span className="font-medium font-mono">{patientData.credentials.password}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Access Code:</span>
              <span className="font-medium font-mono">{patientData.accessCode}</span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            <p>Please provide these credentials to the patient. They will need these to access their account.</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              // Print functionality could be implemented here
              window.print();
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Print Credentials
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPatientSuccessModal; 