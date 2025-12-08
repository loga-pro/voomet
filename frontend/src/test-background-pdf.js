// Test script to verify background PDF generation
import React from 'react';
import ReactDOM from 'react-dom/client';
import BackgroundReportPDFGenerator from './components/Reports/BackgroundReportPDFGenerator';

// Sample test data
const testData = [
  {
    customerName: 'Test Customer 1',
    projectName: 'Test Project 1',
    totalProjectValue: 150000,
    stage: 'design'
  },
  {
    customerName: 'Test Customer 2', 
    projectName: 'Test Project 2',
    totalProjectValue: 200000,
    stage: 'execution'
  }
];

// Create hidden container
const container = document.createElement('div');
container.style.position = 'fixed';
container.style.left = '-9999px';
container.style.top = '-9999px';
document.body.appendChild(container);

const root = ReactDOM.createRoot(container);

const handleComplete = (pdfBlob, filename) => {
  console.log('PDF generated successfully!');
  console.log('Filename:', filename);
  console.log('Blob size:', pdfBlob.size);
  
  // Auto-download the PDF
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Clean up
  root.unmount();
  document.body.removeChild(container);
};

const handleError = (error) => {
  console.error('PDF generation failed:', error);
  root.unmount();
  document.body.removeChild(container);
};

// Render the background PDF generator
root.render(
  React.createElement(BackgroundReportPDFGenerator, {
    reportData: testData,
    reportType: 'test-report',
    reportTitle: 'Test Background PDF Report',
    onComplete: handleComplete,
    onError: handleError
  })
);