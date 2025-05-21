const fs = require('fs');
const path = require('path');

// Define the uploads directory path
const uploadsDir = path.join(__dirname, 'uploads');

console.log('Testing uploads directory...');
console.log('Uploads directory path:', uploadsDir);

// Check if directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log('Uploads directory does not exist. Creating it...');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Successfully created uploads directory.');
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    process.exit(1);
  }
} else {
  console.log('Uploads directory exists.');
}

// Test write permissions
const testFilePath = path.join(uploadsDir, 'test-file.txt');
try {
  fs.writeFileSync(testFilePath, 'This is a test file to check write permissions.');
  console.log('Successfully wrote test file to uploads directory.');
  
  // Clean up test file
  fs.unlinkSync(testFilePath);
  console.log('Successfully deleted test file.');
} catch (err) {
  console.error('Error writing to uploads directory:', err);
  console.log('This indicates a permissions issue. Please ensure the uploads directory is writable.');
  process.exit(1);
}

// List files in uploads directory
try {
  const files = fs.readdirSync(uploadsDir);
  console.log('Files in uploads directory:', files.length ? files : 'No files found');
} catch (err) {
  console.error('Error reading uploads directory:', err);
}

console.log('Uploads directory test completed successfully.'); 