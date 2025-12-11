import React, { useState, useRef, useEffect } from 'react';
import {
  DocumentArrowDownIcon,
  XMarkIcon,
  PrinterIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { boqAPI, reportsAPI, projectsAPI, API_BASE_URL } from '../../services/api';
import { CheckCircleIcon } from 'lucide-react';
import EmailCompose from '../EmailCompose/emailCompose';

const AdvancedBOQPDFGenerator = ({ boqData, onClose, hasInOffice = true }) => {
  console.log("boqData", boqData)
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const contentRef = useRef();
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');

  const [emailapiTrigger, setEmailapiTrigger] = useState({
    status: "default",   // "default" | "pending" | "success" | "error"
    message: "no"
  });
  const [emailStatus, setEmailStatus] = useState(null); // 'sending', 'success', 'error' 
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCompose, setEmailCompose] = useState(false);

  // Fetch projects and find matching project name
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsAPI.getAll();
        const allProjects = response.data || [];
        setProjects(allProjects);

        // Find project matching the customer
        const matchingProject = allProjects.find(
          project => project.customerName === boqData.customer
        );

        if (matchingProject) {
          setProjectName(matchingProject.projectName);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [boqData.customer]);

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
      // Capture each page independently
      const pages = contentRef.current.querySelectorAll('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pages[i], {
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
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

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

  const generatePDFBuffer = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = contentRef.current.querySelectorAll('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pages[i], {
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
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      // Convert to buffer for email attachment
      const pdfBuffer = pdf.output('arraybuffer');
      // Convert ArrayBuffer to Uint8Array for browser compatibility
      return new Uint8Array(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF buffer:', error);
      throw error;
    }
  };

  const closeModel = () => {
    setEmailCompose(false)
  }

  const handleSendEmail = async () => {
    setEmailCompose(true)
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const boqCode = generateBOQCode();

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
      return `${baseUrl}${image}`;
    }
    if (!image.path) return null;

    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${image.path}`;
  };

  // Calculate totals
  const itemsTotal = boqData.items?.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0) || 0;

  const transportationCharges = parseFloat(boqData.transportationCharges) || 0;
  const finalTotalWithoutGST = itemsTotal + transportationCharges;
  // const gstPercentage = parseFloat(boqData.gstPercentage) || 18;
  // const gstAmount = finalTotalWithoutGST * (gstPercentage / 100);
  const totalWithGST = boqData.totalWithGST;
  const discountPercentage = boqData.discountPercentage
  const discountAmount = boqData.discountAmount

  // Prepare pages
  const itemsPerPage = 12;
  const pages = [];
  const items = boqData.items || [];

  if (items.length > 0) {
    let k = 0;
    while (k < items.length) {
      pages.push(items.slice(k, k + itemsPerPage));
      k += itemsPerPage;
    }
  } else {
    pages.push([]);
  }

  const handleDownloadPdfForEmailCompose = async (onPdfGenerated, setPreviewLoading) => {
    try {
      setPreviewLoading(true);

      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = contentRef.current.querySelectorAll('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          onclone: clonedDoc => {
            const images = clonedDoc.querySelectorAll('img');
            images.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      // Generate arraybuffer
      const arrayBuffer = pdf.output('arraybuffer');

      // Convert ArrayBuffer → Blob
      const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });

      if (onPdfGenerated) {
        onPdfGenerated({
          file: new File([pdfBlob], `BOQ_${boqData._id}.pdf`, { type: "application/pdf" }),
          url: URL.createObjectURL(pdfBlob),
          name: `BOQ_${boqData._id}.pdf`
        });
      }

      setPreviewLoading(false);
    } catch (error) {
      setPreviewLoading(false);
      console.error('Error loading PDF generator for mail compose:', error);
    }
  };


  const onSend = async (emailComposeData) => {
    try {
      setEmailapiTrigger({
        status: "pending",
        message: "Sending email..."
      });

      // Build FormData
      const formData = new FormData();

      formData.append("from", emailComposeData.from || "");
      emailComposeData.to.forEach(v => formData.append("to", v));
      emailComposeData.cc.forEach(v => formData.append("cc", v));
      emailComposeData.bcc.forEach(v => formData.append("bcc", v));
      formData.append("subject", emailComposeData.subject || "");
      formData.append("body", emailComposeData.body || "");

      // Attach files
      if (emailComposeData.attachments && emailComposeData.attachments.length > 0) {
        emailComposeData.attachments.forEach(file => {
          formData.append("attachments", file);
        });
      }

      // Call backend email API
      await reportsAPI.sendEmail(formData);

      // Success
      setEmailapiTrigger({
        status: "success",
        message: `Email successfully sent to ${emailComposeData.to}`
      });
      closeModel();

      setEmailStatus('success')
      setEmailMessage(`Email successfully sent to ${emailComposeData.to}`)
      // Clear message after delay
      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
        setEmailStatus(null)
        setEmailMessage(``)
      }, 3000);

    } catch (error) {
      setEmailapiTrigger({
        status: "error",
        message: `Failed to send email: ${error.message}`
      });

      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
      }, 5000);

    } finally {
      setEmailapiTrigger({
        status: "default",
        message: ""
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">

      {emailStatus && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${emailStatus === 'sending' ? 'bg-blue-50 border-blue-200' :
          emailStatus === 'success' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          } border rounded-lg shadow-lg p-4 transition-all duration-300 transform translate-x-0`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {emailStatus === 'sending' && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              )}
              {emailStatus === 'success' && (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
              {emailStatus === 'error' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${emailStatus === 'sending' ? 'text-blue-800' :
                emailStatus === 'success' ? 'text-green-800' :
                  'text-red-800'
                }`}>
                {emailStatus === 'sending' ? 'Sending Email...' :
                  emailStatus === 'success' ? 'Email Sent!' :
                    'Failed to Send Email'}
              </p>
              <p className={`text-sm ${emailStatus === 'sending' ? 'text-blue-700' :
                emailStatus === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                {emailMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[95vh] flex flex-col">
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-xl font-semibold">BOQ PDF Generator - {boqData.customer}</h2>
          <div className="flex space-x-3">

            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm flex items-center disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail || isGeneratingPDF}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center disabled:opacity-50"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Sending...' : 'Send Email'}
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
          <div ref={contentRef}>
            {pages.map((pageItems, pageIndex) => (
              <div
                key={pageIndex}
                className="bg-white p-6 shadow-lg mx-auto mb-8 pdf-page"
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
                     

                    </div>
                  </div>
                  <div className="text-right text-xs leading-tight">
                    <div className="font-semibold text-gray-700">                   
                      No.166,Sy.No.40/1 ,3rd Phase
                      Obdenahalli Industrial Area,Kasabahobli
                      Doddaballapur
                    </div>
                    <div className="text-gray-600">Bangalore</div>
                    <div className="text-gray-600">Karnataka, Code : 29</div>
                    <div className="text-gray-600">PIN: 561203</div>
                    <div className="mt-1 text-gray-500">
                      <div>Ph: {companyInfo.phone}</div>
                      <div>Email: Accounts@voomet.com</div>
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
                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{projectName || 'Interior Design'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-bold w-28 text-sm">ESTIMATE :</span>
                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm font-mono">{boqCode}</span>
                      </div>
                      <div className="flex">
                        <span className="font-bold w-28 text-sm">DATE:</span>
                        <span className="flex-1 border-b border-dotted border-gray-400 pb-1 text-sm">{currentDate}</span>
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
                        {hasInOffice && <>
                          <th className="border border-blue-800 p-2 font-bold text-center">RATE (₹)</th>
                          <th className="border border-blue-800 p-2 font-bold text-center">AMOUNT (₹)</th>
                          <th className="border border-blue-800 p-2 font-bold text-center">REMARKS</th>
                          <th className="border border-blue-800 p-2 font-bold text-center">IMAGE</th>
                        </>}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Items */}
                      {pageItems && pageItems.map((item, index) => (
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
                          {hasInOffice && <> <td className="border border-blue-800 p-2 text-right align-top font-mono">
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
                            <td className="border border-blue-800 p-2 text-right align-top font-mono font-semibold">
                              {item.remarks || " "}
                            </td>
                            <td className="border border-blue-800 p-2 text-center align-top">
                              {getImageUrl(item.image) && (
                                <img
                                  src={getImageUrl(item.image)}
                                  alt="Item"
                                  className="h-16 w-16 object-contain mx-auto"
                                  crossOrigin="anonymous"
                                />
                              )}
                            </td>
                          </>}
                        </tr>
                      ))}

                      {/* Transportation Charges Row - Only on last page */}
                      {pageIndex === pages.length - 1 && hasInOffice && transportationCharges > 0 && (
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

                {/* Totals Section - Only on Last Page */}
                {pageIndex === pages.length - 1 && hasInOffice && <div className="bg-blue-800 text-white mb-4">
                  <div className="grid grid-cols-4">
                    <div className="p-3 border-r border-blue-600 text-center">
                      <div className="text-xs font-medium mb-1">SUBTOTAL (Excl. GST)</div>
                      <div className="text-lg font-bold font-mono">
                        ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 border-r border-blue-600 text-center">
                      <div className="text-xs font-medium mb-1">Discount - ({discountPercentage}) %</div>
                      <div className="text-lg font-bold font-mono">
                        ₹{(discountAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 border-r border-blue-600 text-center">
                      <div className="text-xs font-medium mb-1">GST @ {boqData.gstPercentage}%</div>
                      <div className="text-lg font-bold font-mono text-yellow-300">
                        ₹{((totalWithGST - (finalTotalWithoutGST - (discountAmount || 0))) || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 text-center bg-green-600">
                      <div className="text-xs font-medium mb-1">GRAND TOTAL</div>
                      <div className="text-xl font-bold font-mono">
                        ₹{(totalWithGST || 0)?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>}

                {/* Terms and Conditions - Only on Last Page */}
                {pageIndex === pages.length - 1 && (
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
                )}

                {/* Overall Remarks - Only on Last Page? Or repeats? Usually last page. */}
                {pageIndex === pages.length - 1 && boqData.overallRemarks && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-bold mb-1 text-yellow-800 text-sm">Special Remarks:</h4>
                    <p className="text-xs text-yellow-700">{boqData.overallRemarks}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-3 border-t text-center text-xs text-blue-600">
                  <p className="font-medium">This is a system generated quotation - {currentDate} - Page {pageIndex + 1} of {pages.length}</p>
                  <p className="mt-1">Thank you for choosing {companyInfo.name} for your interior design needs!</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {emailCompose &&
        <EmailCompose
          emailAddress={"support@caldimengg.in"}
          modelTitle={"Send Report"}
          onSend={onSend}
          closeModel={closeModel}
          tomail={[]}
          handlePreview={(handlePdfAttach, setPreviewLoading) => handleDownloadPdfForEmailCompose(handlePdfAttach, setPreviewLoading)}
          emailapiTrigger={emailapiTrigger}
          emailMeta={{
            title: "Bill of Quantities (BOQ) Management Report",
            reportType: "Bill of Quantities",
            data: [],
            defaultSubject: `Bill of Quantities (BOQ) Management Report`
          }}
        />
      }

      <style jsx="true">{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .pdf-page {
             break-after: page;
             page-break-after: always;
             margin: 0 !important;
             box-shadow: none !important;
             border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdvancedBOQPDFGenerator;