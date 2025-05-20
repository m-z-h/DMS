# Medical Records System

A secure digital healthcare platform for managing patient records, doctor profiles, and hospital data.

## Features

- Role-based access control (Admin, Doctor, Patient)
- Hospital and department management
- Patient record management with encryption
- Cross-hospital data access
- Doctor profile management with hospital email domain validation

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Running the Application

### Using the Start Script

The easiest way to start the application:

```
.\start_servers.bat
```

This will:
1. Seed the database with hospitals and departments
2. Start the backend server
3. Start the frontend development server

### Manual Start

If you prefer to start the servers manually:

1. Seed the database:
   ```
   cd backend && node src/seedData.js
   ```

2. Start the backend server:
   ```
   cd backend && npm start
   ```

3. Start the frontend development server:
   ```
   cd frontend && npm run dev
   ```

## Default Data for Testing

### Hospitals
The system includes 5 hospitals:
- Manipal Hospital (Email Domain: manipal.com)
- Apollo Hospital (Email Domain: apollo.com)
- Fortis Hospital (Email Domain: fortis.com)
- Max Healthcare (Email Domain: maxhealthcare.com)
- AIIMS (Email Domain: aiims.edu)

### Departments
Each hospital has 5 unique departments, selected randomly from:
- Cardiology
- Neurology
- Orthopedics
- Oncology
- General Medicine
- Pediatrics
- Gynecology
- Dermatology
- Ophthalmology
- ENT (Ear, Nose, and Throat)

When registering as a doctor:
1. Select a hospital from the dropdown
2. The department dropdown will be populated with only the departments available at the selected hospital
3. Select one of the available departments
4. Use an email address with the selected hospital's domain (e.g., doctor@manipal.com for Manipal Hospital)

## License

This project is licensed under the MIT License. 