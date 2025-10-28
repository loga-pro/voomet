import React, { useState, useRef } from 'react';
import { 
  DocumentArrowDownIcon, 
  XMarkIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const AdvancedBOQPDFGenerator = ({ boqData, onClose }) => {
  const [companyLogo] = useState('/images/voomet-logo.png');
  const [companyInfo] = useState({
    name: 'VOOMET',
    address: 'P-31, GRTC, Mandi, Armsul Park',
    city: 'Siddarthanagara, Kartarpet-561203',
    state: 'Karnataka',
    pincode: '561203',
    phone: '+91 90450 76578',
    email: 'info@voomet.com',
    website: 'www.voomet.com',
    authorizedPerson: 'Authorized Signature',
  });

  const [termsAndConditions, setTermsAndConditions] = useState([
    "• All rates are inclusive of material and labor",
    "• Payment: 50% advance, 40% on completion, 10% after 7 days",
    "• Warranty: 1 year on workmanship",
    "• Timeline: As per mutual agreement",
    "• Subject to site conditions"
  ]);

  const [customEstimateNumber, setCustomEstimateNumber] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const contentRef = useRef();

  // Generate unique BOQ code
  const generateBOQCode = () => {
    if (customEstimateNumber.trim() !== '') {
      return customEstimateNumber;
    }
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    return `VOO/${randomNum}/${day}${month}${year}`;
  };

  const addTerm = () => {
    setTermsAndConditions([...termsAndConditions, "• New term..."]);
  };

  const removeTerm = (index) => {
    const newTerms = [...termsAndConditions];
    newTerms.splice(index, 1);
    setTermsAndConditions(newTerms);
  };

  const updateTerm = (index, value) => {
    const newTerms = [...termsAndConditions];
    newTerms[index] = value;
    setTermsAndConditions(newTerms);
  };

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
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `BOQ_${boqData.customer?.replace(/[^a-zA-Z0-9]/g, '_')}_${generateBOQCode()}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const boqCode = generateBOQCode();

  // Calculate totals
  const itemsTotal = boqData.items?.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0) || 0;

  const transportationCharges = parseFloat(boqData.transportationCharges) || 0;
  const finalTotalWithoutGST = itemsTotal + transportationCharges;
  const gstPercentage = parseFloat(boqData.gstPercentage) || 18;
  const gstAmount = finalTotalWithoutGST * (gstPercentage / 100);
  const totalWithGST = finalTotalWithoutGST + gstAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[95vh] flex flex-col">
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold">BOQ PDF Generator - {boqData.customer}</h2>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
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

        {/* Editable Controls */}
        <div className="p-4 bg-blue-50 border-b print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Estimate Number Editor */}
            <div>
              <h3 className="font-semibold mb-3 text-blue-700">Estimate Number</h3>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={customEstimateNumber}
                  onChange={(e) => setCustomEstimateNumber(e.target.value)}
                  placeholder="Leave empty for auto-generated number"
                  className="flex-1 p-2 border rounded text-sm"
                />
                <span className="text-sm text-blue-600 whitespace-nowrap">
                  Auto: {generateBOQCode()}
                </span>
              </div>
            </div>

            {/* Terms & Conditions Editor */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-blue-700">Terms & Conditions</h3>
                <button
                  onClick={addTerm}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Add Term
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {termsAndConditions.map((term, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => updateTerm(index, e.target.value)}
                      className="flex-1 p-2 border rounded text-sm"
                    />
                    <button
                      onClick={() => removeTerm(index)}
                      className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-blue-100 p-4">
          <div 
            ref={contentRef} 
            className="bg-white p-6 shadow-lg mx-auto" 
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              fontFamily: 'Arial, sans-serif',
              fontSize: '12px'
            }}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-blue-900">
              <div className="flex items-center space-x-4">
                <img 
                  src={'/images/voomet-logo.png'} 
                  alt="Company Logo" 
                  className="h-16 w-auto max-w-32 object-contain"
                  style={{ 
                    imageRendering: 'crisp-edges',
                    maxHeight: '64px'
                  }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'h-16 w-16 bg-blue-200 flex items-center justify-center rounded';
                    fallback.innerHTML = '<span class="text-blue-600 font-bold text-lg">V</span>';
                    e.target.parentNode.appendChild(fallback);
                  }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {companyInfo.name}
                  </h1>
                  <div className="text-xs text-gray-600 mt-1">
                    CONSTRUCTION & PROJECT MANAGEMENT
                  </div>
                </div>
              </div>
              <div className="text-right text-xs leading-tight">
                <div className="font-semibold text-gray-700">{companyInfo.address}</div>
                <div className="text-gray-600">{companyInfo.city}</div>
                <div className="text-gray-600">{companyInfo.state}</div>
                <div className="text-gray-600">PIN: {companyInfo.pincode}</div>
                <div className="mt-1 text-gray-500">
                  <div>Ph: {companyInfo.phone}</div>
                  <div>Email: {companyInfo.email}</div>
                  <div>Web: {companyInfo.website}</div>
                </div>
              </div>
            </div>

            {/* Title and Client Info */}
            <div className="mb-6">
              <div className="bg-blue-800 text-white p-3 mb-4">
                <h2 className="text-lg font-bold text-center">BILL OF QUANTITIES (BOQ)</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-4">
                <div className="space-y-2">
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">CLIENT NAME:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{boqData.customer}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">LOCATION:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{boqData.location || 'Bangalore'}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">PROJECT:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{boqData.projectName || 'Interior Design'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">ESTIMATE #:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm font-mono">{boqCode}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">DATE:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{currentDate}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-28 text-sm">VALID UNTIL:</span> 
                    <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">
                      {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Table */}
            <div className="mb-4">
              <div className="bg-gray-600 text-white p-2 mb-0">
                <h3 className="font-bold text-center text-sm">DETAILED QUOTATION</h3>
              </div>
              
              <table className="w-full border-collapse border border-blue-800 text-xs">
                <thead>
                  <tr className="bg-blue-200">
                    <th className="border border-blue-800 p-2 font-bold text-left">DESCRIPTION</th>
                    <th className="border border-blue-800 p-2 font-bold text-center">SPECIFICATION</th>
                    <th className="border border-blue-800 p-2 font-bold text-center">QTY</th>
                    <th className="border border-blue-800 p-2 font-bold text-center">UNIT</th>
                    <th className="border border-blue-800 p-2 font-bold text-center">RATE (₹)</th>
                    <th className="border border-blue-800 p-2 font-bold text-center">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Items */}
                  {boqData.items && boqData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-blue-800 p-2 align-top">
                        <div className="font-medium">{item.partName}</div>
                      </td>
                      <td className="border border-blue-800 p-2 text-center align-top">
                        {item.unitType}
                      </td>
                      <td className="border border-blue-800 p-2 text-center align-top font-mono">
                        {parseFloat(item.numberOfUnits || 0).toLocaleString()}
                      </td>
                      <td className="border border-blue-800 p-2 text-center align-top">
                        {item.unitType}
                      </td>
                      <td className="border border-blue-800 p-2 text-right align-top font-mono">
                        {parseFloat(item.unitPrice || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="border border-blue-800 p-2 text-right align-top font-mono font-semibold">
                        {parseFloat(item.totalPrice || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Transportation Charges Row */}
                  {transportationCharges > 0 && (
                    <tr className="bg-blue-50">
                      <td className="border border-blue-800 p-2 font-medium" colSpan="5">
                        Transportation & Handling Charges
                      </td>
                      <td className="border border-blue-800 p-2 text-right font-mono font-semibold">
                        {transportationCharges.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="bg-blue-800 text-white mb-4">
              <div className="grid grid-cols-3">
                <div className="p-3 border-r border-blue-600 text-center">
                  <div className="text-xs font-medium mb-1">SUBTOTAL (Excl. GST)</div>
                  <div className="text-lg font-bold font-mono">
                    ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 border-r border-blue-600 text-center">
                  <div className="text-xs font-medium mb-1">GST @ {gstPercentage}%</div>
                  <div className="text-lg font-bold font-mono text-yellow-300">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-3 text-center bg-green-600">
                  <div className="text-xs font-medium mb-1">GRAND TOTAL</div>
                  <div className="text-xl font-bold font-mono">
                    ₹{totalWithGST.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mb-4">
              <div className="bg-blue-50 p-3 border-l-4 border-blue-600">
                <h4 className="font-bold mb-2 text-blue-800 text-sm">Terms & Conditions:</h4>
                <div className="text-xs text-blue-700">
                  <ul className="space-y-1">
                    {termsAndConditions.map((term, index) => (
                      <li key={index}>{term}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Overall Remarks */}
            {boqData.overallRemarks && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-bold mb-1 text-yellow-800 text-sm">Special Remarks:</h4>
                <p className="text-xs text-yellow-700">{boqData.overallRemarks}</p>
              </div>
            )}

            {/* Signature Section */}
            <div className="mt-6 pt-4 border-t border-blue-300">
              <div className="text-center">
                <div className="border-t border-blue-400 pt-2 mt-8 inline-block px-8">
                  <div className="font-semibold text-sm">{companyInfo.authorizedPerson}</div>
                  <div className="text-xs text-blue-600 mt-1">{companyInfo.name}</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t text-center text-xs text-blue-600">
              <p className="font-medium">This is a system generated quotation - {currentDate}</p>
              <p className="mt-1">Thank you for choosing {companyInfo.name} for your interior design needs!</p>
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
          
          .print\\:hidden {
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

export default AdvancedBOQPDFGenerator;