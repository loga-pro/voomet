import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  DocumentArrowDownIcon, 
  PrinterIcon,
  PhotoIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const AdvancedReportPDFGenerator = ({ reportData, reportType, reportTitle, onClose, onEmail, autoGenerate = false }) => {
  const contentRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [companyLogo, setCompanyLogo] = useState('/images/voomet-logo.png');
  
  // Auto-generate PDF on mount if autoGenerate is true
  useEffect(() => {
    if (autoGenerate) {
      const timer = setTimeout(() => {
        generatePDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoGenerate]);
  
  const [companyInfo, setCompanyInfo] = useState({
    name: 'VOOMET INTERIORS',
    tagline: 'Crafting Beautiful Spaces',
    address: '123, Interior Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    phone: '+91-9876543210',
    email: 'info@voometinteriors.com',
    website: 'www.voometinteriors.com',
    authorizedPerson: 'Authorized Signatory'
  });

  // Auto-generate report code
  const generateReportCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `RPT/${randomNum}/${day}${month}${year}`;
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => setCompanyLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const element = contentRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `${reportType}-report_${generateReportCode()}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle email
  const handleEmail = async () => {
    if (onEmail) {
      setIsGeneratingPDF(true);
      try {
        const jsPDF = (await import('jspdf')).default;
        const html2canvas = (await import('html2canvas')).default;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const element = contentRef.current;
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        
        const pdfBlob = pdf.output('blob');
        await onEmail(pdfBlob, `${reportType}-report_${generateReportCode()}.pdf`);
        
      } catch (error) {
        console.error('Error generating PDF for email:', error);
        alert('Error generating PDF for email. Please try again.');
      } finally {
        setIsGeneratingPDF(false);
      }
    }
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Get report statistics
  const getReportStats = () => {
    if (!reportData || reportData.length === 0) return { totalRecords: 0, totalValue: 0 };
    
    let totalValue = 0;
    reportData.forEach(item => {
      if (item.totalProjectValue) totalValue += item.totalProjectValue;
      if (item.totalAmount) totalValue += item.totalAmount;
      if (item.paymentAmount) totalValue += item.paymentAmount;
    });
    
    return {
      totalRecords: reportData.length,
      totalValue: totalValue
    };
  };

  const stats = getReportStats();

  // Get table headers based on report type
  const getTableHeaders = () => {
    if (!reportData || reportData.length === 0) return [];
    
    const firstItem = reportData[0];
    return Object.keys(firstItem).filter(key => 
      !key.startsWith('_') && 
      key !== '__v' && 
      typeof firstItem[key] !== 'object'
    );
  };

  const headers = getTableHeaders();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-full max-h-[95vh] flex flex-col">
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold">{reportTitle} - PDF Generator</h2>
          <div className="flex space-x-3">
            <label className="cursor-pointer bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-md text-sm flex items-center">
              <PhotoIcon className="h-4 w-4 mr-2" />
              Logo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            {onEmail && (
              <button
                onClick={handleEmail}
                disabled={isGeneratingPDF}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm flex items-center disabled:opacity-50"
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Email PDF'}
              </button>
            )}
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded-md"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-blue-100 p-4">
          <div ref={contentRef} className="bg-white p-8 shadow-lg max-w-6xl mx-auto" style={{ minHeight: '297mm' }}>
            {/* Header Section */}
            <div className="flex justify-between items-start mb-8 pb-4 border-b-4 border-blue-900">
              <div className="flex items-center space-x-6">
                {companyLogo ? (
                  <img 
                    src={companyLogo} 
                    alt="Company Logo" 
                    className="h-32 w-32 object-contain"
                  />
                ) : (
                  <div className="h-32 w-32 bg-blue-200 flex items-center justify-center rounded">
                    <PhotoIcon className="h-12 w-12 text-blue-400" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold bg-gray-900 text-white px-4 py-2 inline-block">
                    {companyInfo.name}
                  </h1>
                  <div className="mt-2 text-sm font-medium text-blue-700">
                    {companyInfo.tagline}
                  </div>
                </div>
              </div>
              <div className="text-right text-sm leading-relaxed">
                <div className="font-semibold">{companyInfo.address}</div>
                <div>{companyInfo.city}</div>
                {companyInfo.state && <div>{companyInfo.state}</div>}
                {companyInfo.pincode && <div>PIN: {companyInfo.pincode}</div>}
                <div className="mt-2">
                  <div>Ph: {companyInfo.phone}</div>
                  <div>Email: {companyInfo.email}</div>
                  <div>Web: {companyInfo.website}</div>
                </div>
              </div>
            </div>

            {/* Report Title and Info */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-blue-900 mb-4">{reportTitle}</h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-semibold text-blue-700">Report Code</div>
                  <div className="text-lg font-bold">{generateReportCode()}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-semibold text-blue-700">Generated Date</div>
                  <div className="text-lg font-bold">{currentDate}</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="font-semibold text-blue-700">Total Records</div>
                  <div className="text-lg font-bold">{stats.totalRecords}</div>
                </div>
              </div>
            </div>

            {/* Report Data Table */}
            {reportData && reportData.length > 0 ? (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Report Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        {headers.map((header, index) => (
                          <th key={index} className="border border-gray-300 px-4 py-3 text-left font-semibold">
                            {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((item, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {headers.map((header, colIndex) => (
                            <td key={colIndex} className="border border-gray-300 px-4 py-3 text-sm">
                              {typeof item[header] === 'boolean' 
                                ? (item[header] ? 'Yes' : 'No')
                                : (item[header] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No data available for this report</div>
              </div>
            )}

            {/* Summary Section */}
            {stats.totalValue > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Financial Summary</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-700 font-semibold">Total Value</div>
                  <div className="text-2xl font-bold text-green-800">
                    ₹{stats.totalValue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Authorized Signatory */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t-2 border-blue-300">
              <div className="text-center">
                <div className="border-t border-blue-400 pt-2 mt-16">
                  <div className="font-semibold">{companyInfo.authorizedPerson}</div>
                  <div className="text-sm text-blue-600 mt-1">{companyInfo.name}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t text-center text-sm text-blue-600">
              <p className="font-medium">This is a system generated report - {currentDate}</p>
              <p className="mt-2">Thank you for choosing {companyInfo.name}!</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            margin: 10mm;
            size: A4;
          }
          
          .print\:hidden {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdvancedReportPDFGenerator;