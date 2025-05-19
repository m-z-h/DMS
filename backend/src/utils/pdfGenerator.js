const PDFDocument = require('pdfkit');

/**
 * Generate a PDF document with patient credentials
 * @param {Object} data - Patient data for the PDF
 * @param {string} data.patientName - Full name of the patient
 * @param {string} data.patientId - Patient ID
 * @param {string} data.username - Username for login
 * @param {string} data.password - Temporary password (plaintext)
 * @param {string} data.accessCode - Access code for medical records
 * @returns {Promise<Buffer>} PDF document as a buffer
 */
exports.generatePDF = async (data) => {
  return new Promise((resolve, reject) => {
    try {
      const { patientName, patientId, username, password, accessCode } = data;
      
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 72,
          right: 72
        }
      });
      
      // Collect the data in a buffer
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Add the document content
      
      // Header
      doc.fontSize(20)
         .fillColor('#0047AB')
         .text('Medical Data Management System', { align: 'center' })
         .moveDown();
         
      doc.fontSize(16)
         .fillColor('#0047AB')
         .text('Patient Credentials', { align: 'center' })
         .moveDown();
      
      // Current date
      doc.fontSize(10)
         .fillColor('#555')
         .text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' })
         .moveDown(2);
      
      // Patient info section
      doc.fontSize(14)
         .fillColor('#000')
         .text('Patient Information', { underline: true })
         .moveDown();
         
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Full Name: ${patientName}`)
         .text(`Patient ID: ${patientId}`)
         .moveDown(1.5);
      
      // Login credentials section
      doc.fontSize(14)
         .fillColor('#000')
         .text('Login Credentials', { underline: true })
         .moveDown();
         
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Username: ${username}`)
         .text(`Temporary Password: ${password}`)
         .moveDown(1.5);
      
      // Access code section
      doc.fontSize(14)
         .fillColor('#000')
         .text('Access Code', { underline: true })
         .moveDown();
      
      doc.fontSize(12)
         .fillColor('#333')
         .text('Your access code is required for doctors to view your medical records. Please keep it secure and share only with authorized medical professionals.')
         .moveDown();
         
      doc.fontSize(16)
         .fillColor('#CC0000')
         .text(`${accessCode}`, { align: 'center' })
         .moveDown(2);
      
      // Footer
      doc.fontSize(10)
         .fillColor('#555')
         .text('IMPORTANT: Please change your temporary password after your first login.', { align: 'center' })
         .moveDown(0.5)
         .text('This document contains confidential information. Keep it secure.', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}; 