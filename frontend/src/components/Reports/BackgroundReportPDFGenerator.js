import React, { useRef, useEffect, useState } from 'react';

const BackgroundReportPDFGenerator = ({ reportData, reportType, reportTitle, onComplete, onError }) => {
  const contentRef = useRef();
  const [companyLogo] = useState('/images/voomet-logo.png');
  
  const companyInfo = {
    name: 'VOOMET',
    address: 'P-31, GRTC, Mandi, Armsul Park',
    city: 'Siddarthanagara, Kartarpet-561203',
    state: 'Karnataka',
    pincode: '561203',
    phone: '+91 90450 76578',
    email: 'info@voomet.com',
    website: 'www.voomet.com',
  };

  // Auto-generate report code
  const generateReportCode = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `RPT/${randomNum}/${day}${month}${year}`;
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

  // Generate PDF in background
  const generatePDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for wide tables
      const element = contentRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 0.8, // Reduced scale for smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        width: 1200, // Limit width to reduce file size
        height: Math.min(element.scrollHeight, 2000) // Limit height
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.6); // JPEG with 60% quality for smaller size
      const imgWidth = 297; // A4 landscape width
      const pageHeight = 210; // A4 landscape height
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
      const pdfBlob = pdf.output('blob');
      
      // Call the completion callback
      if (onComplete) {
        onComplete(pdfBlob, fileName);
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  // Auto-generate PDF on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePDF();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Hidden PDF content
  return (
    <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
      <div ref={contentRef} className="bg-white p-8" style={{ width: '297mm', minHeight: '210mm' }}>
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b-4 border-blue-900">
          <div className="flex items-center space-x-6">
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-20 w-20 object-contain" // Reduced logo size
                style={{ imageRendering: 'auto' }} // Optimized rendering
                crossOrigin="anonymous"
              />
            ) : (
              <div className="h-20 w-20 bg-blue-200 flex items-center justify-center rounded">
                <div className="h-8 w-8 bg-blue-400 rounded"></div>
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
            <div className="w-full">
              <table className="w-full border-collapse border border-gray-400 text-xs">
                <thead>
                  <tr className="bg-gray-200">
                    {headers.map((header, index) => (
                      <th key={index} className="border border-gray-400 px-2 py-1 text-left font-medium whitespace-nowrap">
                        {header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, rowIndex) => (
                    <tr key={rowIndex} className="bg-white">
                      {headers.map((header, colIndex) => (
                        <td key={colIndex} className="border border-gray-400 px-2 py-1 whitespace-nowrap">
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
      </div>
    </div>
  );
};

export default BackgroundReportPDFGenerator;