import React from 'react';
import TestComprehensivePDF from './TestComprehensivePDF';

const PDFTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Comprehensive Project Report PDF Test
          </h1>
          <p className="text-gray-600">
            Test the PDF generation with new fields: Invoice Raised, Payment Received, Balance Amount, Task Completed, Milestone Completion
          </p>
        </div>
        
        <TestComprehensivePDF />
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click "Generate Test PDF" to create a comprehensive project report</li>
            <li>The PDF will automatically download with sample data</li>
            <li>Verify that the new fields appear correctly in the PDF:</li>
            <ul className="ml-6 list-disc list-inside space-y-1">
              <li>Invoice Raised (currency format)</li>
              <li>Payment Received (currency format)</li>
              <li>Balance Amount (currency format)</li>
              <li>Task Completed (format: completed/total, e.g., 8/12)</li>
              <li>Milestone Completion (percentage format)</li>
            </ul>
            <li>Check that the task completion shows the correct ratio (e.g., 8/12)</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default PDFTestPage;