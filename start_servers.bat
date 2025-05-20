@echo off
echo Starting Medical Records System...

echo Seeding database with hospitals and departments...
cd backend && node src/seedData.js
cd ..

echo Starting Backend Server...
start cmd /k "cd backend && npm start"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev"

echo Servers started! Open your browser to http://localhost:5173 