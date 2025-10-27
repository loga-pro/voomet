import React, { useEffect, useState } from 'react';
import BackgroundReportPDFGenerator from '../components/Reports/BackgroundReportPDFGenerator';

const TestOptimizedPDF = () => {
  const [testData] = useState([
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
  ]);

  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [error, setError] = useState(null);

  const handleComplete = (pdfBlob, filename) => {
    console.log('PDF generated successfully!');
    console.log('Filename:', filename);
    console.log('Blob size:', pdfBlob.size);
    setPdfGenerated(true);
    
    // Auto-download the PDF
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleError = (error) => {
    console.error('PDF generation failed:', error);
    setError(error.message || 'PDF generation failed');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Test Optimized PDF Generation</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Test Data</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-600">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          </div>

          {!pdfGenerated && !error && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating PDF in the background...</p>
            </div>
          )}

          {pdfGenerated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    PDF generated successfully! The download should have started automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Error: {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="hidden">
            <BackgroundReportPDFGenerator
              reportData={testData}
              reportType="test-report"
              reportTitle="Test Background PDF Report"
              onComplete={handleComplete}
              onError={handleError}
              autoGenerate={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestOptimizedPDF;