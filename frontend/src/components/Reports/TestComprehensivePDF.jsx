import React, { useState } from 'react';
import BackgroundReportPDFGenerator from './BackgroundReportPDFGenerator';

// Test data for comprehensive project report with new fields
const testComprehensiveProjectData = [
  {
    _id: '1',
    customerName: 'ABC Corporation',
    projectName: 'Office Renovation Project',
    stage: 'EXECUTION_STAGE',
    totalProjectValue: 2500000,
    enquiryDate: '2024-01-15',
    // New fields for PDF
    paymentData: {
      totalInvoiceRaised: 1500000,
      totalPaymentReceived: 1000000,
      balanceAmount: 500000
    },
    milestoneData: {
      milestoneCompletionRate: 65,
      completedTasks: 8,
      totalTasks: 12,
      taskCompletionRate: 67
    }
  },
  {
    _id: '2',
    customerName: 'XYZ Industries',
    projectName: 'Factory Construction',
    stage: 'DESIGN_STAGE',
    totalProjectValue: 5000000,
    enquiryDate: '2024-02-01',
    // New fields for PDF
    paymentData: {
      totalInvoiceRaised: 2000000,
      totalPaymentReceived: 1800000,
      balanceAmount: 200000
    },
    milestoneData: {
      milestoneCompletionRate: 40,
      completedTasks: 4,
      totalTasks: 10,
      taskCompletionRate: 40
    }
  }
];

const TestComprehensivePDF = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const handlePDFComplete = (pdfBlob, fileName) => {
    console.log('PDF generated successfully:', fileName);
    console.log('PDF Blob size:', pdfBlob.size, 'bytes');
    
    // Create download link
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setPdfGenerated(true);
    setIsGenerating(false);
  };

  const handlePDFError = (error) => {
    console.error('PDF generation error:', error);
    setIsGenerating(false);
  };

  const generateTestPDF = () => {
    setIsGenerating(true);
    setPdfGenerated(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Test Comprehensive Project Report PDF</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Test Data Preview:</h3>
        <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Stage</th>
                <th className="px-3 py-2 text-left">Total Value</th>
                <th className="px-3 py-2 text-left">Invoice Raised</th>
                <th className="px-3 py-2 text-left">Payment Received</th>
                <th className="px-3 py-2 text-left">Balance</th>
                <th className="px-3 py-2 text-left">Tasks</th>
                <th className="px-3 py-2 text-left">Milestone %</th>
              </tr>
            </thead>
            <tbody>
              {testComprehensiveProjectData.map((project, index) => (
                <tr key={project._id} className="border-b">
                  <td className="px-3 py-2">{project.customerName}</td>
                  <td className="px-3 py-2">{project.projectName}</td>
                  <td className="px-3 py-2">{project.stage?.replace('_', ' ')}</td>
                  <td className="px-3 py-2">₹{project.totalProjectValue?.toLocaleString()}</td>
                  <td className="px-3 py-2">₹{project.paymentData?.totalInvoiceRaised?.toLocaleString()}</td>
                  <td className="px-3 py-2">₹{project.paymentData?.totalPaymentReceived?.toLocaleString()}</td>
                  <td className="px-3 py-2">₹{project.paymentData?.balanceAmount?.toLocaleString()}</td>
                  <td className="px-3 py-2">{project.milestoneData?.completedTasks}/{project.milestoneData?.totalTasks}</td>
                  <td className="px-3 py-2">{project.milestoneData?.milestoneCompletionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Expected PDF Headers:</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
            <span className="bg-white px-2 py-1 rounded">Customer Name</span>
            <span className="bg-white px-2 py-1 rounded">Project Name</span>
            <span className="bg-white px-2 py-1 rounded">Stage</span>
            <span className="bg-white px-2 py-1 rounded">Total Value (₹)</span>
            <span className="bg-white px-2 py-1 rounded">Invoice Raised (₹)</span>
            <span className="bg-white px-2 py-1 rounded">Payment Received (₹)</span>
            <span className="bg-white px-2 py-1 rounded">Balance Amount (₹)</span>
            <span className="bg-white px-2 py-1 rounded">Task Completed</span>
            <span className="bg-white px-2 py-1 rounded">Milestone Completion</span>
            <span className="bg-white px-2 py-1 rounded">Enquiry Date</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={generateTestPDF}
          disabled={isGenerating}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isGenerating 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isGenerating ? 'Generating PDF...' : 'Generate Test PDF'}
        </button>
        
        {pdfGenerated && (
          <div className="text-green-600 font-medium flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            PDF Generated Successfully!
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            <strong>Generating PDF...</strong> Please wait while we create your comprehensive project report with the new fields.
          </p>
          <div className="mt-2 text-sm text-yellow-700">
            This will include: Invoice Raised, Payment Received, Balance Amount, Task Completed (completed/total format), and Milestone Completion.
          </div>
        </div>
      )}

      {/* Hidden PDF Generator Component */}
      {isGenerating && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <BackgroundReportPDFGenerator
            reportData={testComprehensiveProjectData}
            reportType="project-comprehensive"
            reportTitle="Comprehensive Project Report"
            onComplete={handlePDFComplete}
            onError={handlePDFError}
          />
        </div>
      )}
    </div>
  );
};

export default TestComprehensivePDF;