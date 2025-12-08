// Test file to verify milestone PDF generation with Project Tasks
import React from 'react';
import ReactDOM from 'react-dom/client';
import BackgroundReportPDFGenerator from './components/Reports/BackgroundReportPDFGenerator.js';

// Sample milestone data with tasks
const testMilestoneData = [
  {
    _id: '1',
    customer: 'ABC Corporation',
    projectName: 'Office Building Construction',
    startDate: '2024-01-15',
    endDate: '2024-06-30',
    projectStatus: 'In Progress',
    emailId: 'contact@abccorp.com',
    tasks: [
      {
        phase: 'Initiation',
        task: 'Project Planning',
        duration: 15,
        startDate: '2024-01-15',
        endDate: '2024-01-30',
        responsiblePerson: 'John Smith'
      },
      {
        phase: 'Planning',
        task: 'Design Approval',
        duration: 10,
        startDate: '2024-01-31',
        endDate: '2024-02-10',
        responsiblePerson: 'Sarah Johnson'
      },
      {
        phase: 'Execution',
        task: 'Foundation Work',
        duration: 30,
        startDate: '2024-02-11',
        endDate: '2024-03-12',
        responsiblePerson: 'Mike Davis'
      },
      {
        phase: 'Execution',
        task: 'Structural Framework',
        duration: 45,
        startDate: '2024-03-13',
        endDate: '2024-04-27',
        responsiblePerson: 'Lisa Brown'
      }
    ]
  },
  {
    _id: '2',
    customer: 'XYZ Industries',
    projectName: 'Warehouse Renovation',
    startDate: '2024-02-01',
    endDate: '2024-05-15',
    projectStatus: 'Completed',
    emailId: 'projects@xyzind.com',
    tasks: [
      {
        phase: 'Planning',
        task: 'Site Inspection',
        duration: 5,
        startDate: '2024-02-01',
        endDate: '2024-02-06',
        responsiblePerson: 'Tom Wilson'
      },
      {
        phase: 'Execution',
        task: 'Demolition Work',
        duration: 20,
        startDate: '2024-02-07',
        endDate: '2024-02-27',
        responsiblePerson: 'Anna Martinez'
      },
      {
        phase: 'Execution',
        task: 'New Construction',
        duration: 60,
        startDate: '2024-02-28',
        endDate: '2024-04-28',
        responsiblePerson: 'David Lee'
      }
    ]
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
  console.log('✅ PDF generated successfully!');
  console.log('Filename:', filename);
  console.log('Blob size:', pdfBlob.size, 'bytes');
  
  // Auto-download the PDF
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📄 Test PDF ready for download!');
  console.log('📋 Check if Project Tasks table appears in the PDF');
  
  // Clean up
  root.unmount();
  document.body.removeChild(container);
};

const handleError = (error) => {
  console.error('❌ PDF generation failed:', error);
  root.unmount();
  document.body.removeChild(container);
};

// Render the background PDF generator
root.render(
  React.createElement(BackgroundReportPDFGenerator, {
    reportData: testMilestoneData,
    reportType: 'milestone',
    reportTitle: 'Milestone Report with Project Tasks',
    onComplete: handleComplete,
    onError: handleError
  })
);

// Export for use
export { testMilestoneData };