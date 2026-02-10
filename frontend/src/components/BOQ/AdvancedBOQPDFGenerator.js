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

const AdvancedBOQPDFGenerator = ({ boqData, onClose, hasInOffice = true, showEstimateNumber = true, showEditableControls = true }) => {
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
  const [customDate, setCustomDate] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const contentRef = useRef();
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');

  // Save states for individual fields
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [estimateSaved, setEstimateSaved] = useState(false);
  const [dateSaved, setDateSaved] = useState(false);
  const [termsSaved, setTermsSaved] = useState(false);

  const [emailapiTrigger, setEmailapiTrigger] = useState({
    status: "default",   // "default" | "pending" | "success" | "error"
    message: "no"
  });
  const [emailStatus, setEmailStatus] = useState(null); // 'sending', 'success', 'error' 
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCompose, setEmailCompose] = useState(false);

  // Scope of Work State
  const [availableScopes, setAvailableScopes] = useState([]);
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [fetchedProject, setFetchedProject] = useState(null);

  // Helper function to normalize scope names for consistent matching
  // This ensures "electrical", "Electrical", "ELECTRICAL" all map to the same canonical form
  const normalizeScope = (scope) => {
    if (!scope) return '';
    return scope.toLowerCase().trim();
  };

  // Initialize available scopes from boqData and filtering logic
  // Initialize available scopes from boqData and filtering logic
  useEffect(() => {
    let scopes = [];

    // Priority 1: Use fetchedProject data if available (Highest Source of Truth)
    // This fixes the issue where staled/incorrect scopes in boqData overwrite actual project scopes
    if (fetchedProject && fetchedProject.scopeOfWork) {
      if (Array.isArray(fetchedProject.scopeOfWork)) {
        scopes = fetchedProject.scopeOfWork;
      } else if (typeof fetchedProject.scopeOfWork === 'string') {
        scopes = fetchedProject.scopeOfWork.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Priority 2: Use boqData.scopeOfWork (Fallback if project data not ready or missing)
    if (scopes.length === 0 && boqData && boqData.scopeOfWork) {
      if (Array.isArray(boqData.scopeOfWork)) {
        scopes = boqData.scopeOfWork;
      } else if (typeof boqData.scopeOfWork === 'string') {
        scopes = boqData.scopeOfWork.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Priority 3: Fallback to unique scopes from items if header scopes are missing
    if (scopes.length === 0 && boqData && boqData.items && boqData.items.length > 0) {
      scopes = [...new Set(boqData.items.map(item => item.scopeOfWork))].filter(Boolean);
    }

    // Ensure uniqueness and remove empty
    scopes = [...new Set(scopes)].filter(Boolean);

    console.log('=== SCOPE INITIALIZATION DEBUG ===');
    console.log('Fetched Project:', fetchedProject);
    console.log('BOQ Data:', boqData);
    console.log('Available Scopes (after processing):', scopes);
    console.log('BOQ Items:', boqData?.items);
    console.log('Item Scopes:', boqData?.items?.map(item => ({
      partName: item.partName,
      scopeOfWork: item.scopeOfWork,
      normalized: normalizeScope(item.scopeOfWork)
    })));

    setAvailableScopes(scopes);
    setSelectedScopes(scopes); // Default select all
  }, [boqData, fetchedProject]);

  // Auto-assign scope to items that don't have one
  // This handles cases where items were created before scope assignment was implemented
  useEffect(() => {
    if (!boqData || !boqData.items || boqData.items.length === 0) return;
    if (availableScopes.length === 0) return;

    let needsUpdate = false;
    const updatedItems = boqData.items.map(item => {
      if (!item.scopeOfWork || item.scopeOfWork.trim() === '') {
        console.warn(`Item "${item.partName}" has no scopeOfWork, assigning to first available scope: ${availableScopes[0]}`);
        needsUpdate = true;
        return { ...item, scopeOfWork: availableScopes[0] };
      }
      return item;
    });

    if (needsUpdate) {
      console.log('=== AUTO-ASSIGNING SCOPES TO ITEMS ===');
      console.log('Items before:', boqData.items);
      console.log('Items after:', updatedItems);
      // Update boqData with corrected items
      boqData.items = updatedItems;
    }
  }, [boqData, availableScopes]);

  const handleScopeSelection = (scope) => {
    setSelectedScopes(prev => {
      if (prev.includes(scope)) {
        return prev.filter(s => s !== scope);
      } else {
        return [...prev, scope];
      }
    });
  };

  // Initialize custom estimate number from boqData
  useEffect(() => {
    if (boqData.estimateNumber) {
      setCustomEstimateNumber(boqData.estimateNumber);
    }
  }, [boqData.estimateNumber]);

  // Initialize custom date from boqData
  useEffect(() => {
    if (boqData.customDate) {
      setCustomDate(boqData.customDate);
    }
  }, [boqData.customDate]);

  // Initialize terms and conditions from boqData
  useEffect(() => {
    if (boqData.termsAndConditions && boqData.termsAndConditions.length > 0) {
      setTermsAndConditions(boqData.termsAndConditions);
    }
  }, [boqData.termsAndConditions]);

  // Fetch projects and find matching project name
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Use filtered API call to reduce data and get specific results
        const response = await projectsAPI.getAll({ customerName: boqData.customer });
        const filteredProjects = response.data || [];
        setProjects(filteredProjects); // We can keep this if needed for other logic, but filtered

        // Find project matching the customer AND project name if available
        // This ensures we get the EXACT project's scope
        const matchingProject = filteredProjects.find(
          project => project.customerName === boqData.customer &&
            (!boqData.projectName || project.projectName === boqData.projectName)
        ) || filteredProjects[0]; // Fallback to first if strict match fails but customer matches

        if (matchingProject) {
          setProjectName(matchingProject.projectName);
          setFetchedProject(matchingProject); // Save the full project object
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    if (boqData.customer) {
      fetchProjects();
    }
  }, [boqData.customer, boqData.projectName]);

  // Get BOQ code (Manual only)
  const generateBOQCode = () => {
    return customEstimateNumber;
  };

  const addTerm = () => {
    const newTerms = [...termsAndConditions, "• New term..."];
    setTermsAndConditions(newTerms);
    setTermsSaved(false); // Mark as unsaved when changed
  };

  const removeTerm = (index) => {
    const newTerms = [...termsAndConditions];
    newTerms.splice(index, 1);
    setTermsAndConditions(newTerms);
    setTermsSaved(false); // Mark as unsaved when changed
  };

  const updateTerm = (index, value) => {
    const newTerms = [...termsAndConditions];
    newTerms[index] = value;
    setTermsAndConditions(newTerms);
    setTermsSaved(false); // Mark as unsaved when changed
  };

  // Manual save function for Terms & Conditions
  const saveTermsAndConditions = async () => {
    if (boqData._id) {
      try {
        setIsSavingTerms(true);
        await boqAPI.update(boqData._id, { termsAndConditions });
        setTermsSaved(true);
        setTimeout(() => setTermsSaved(false), 3000); // Hide success message after 3 seconds
      } catch (error) {
        console.error('Error saving terms and conditions:', error);
        alert('Failed to save terms and conditions');
      } finally {
        setIsSavingTerms(false);
      }
    }
  };

  // Save custom estimate number to database
  const handleEstimateNumberChange = (value) => {
    setCustomEstimateNumber(value);
    setEstimateSaved(false); // Mark as unsaved when changed
  };

  // Manual save function for Estimate Number
  const saveEstimateNumber = async () => {
    if (boqData._id) {
      try {
        setIsSavingEstimate(true);
        await boqAPI.update(boqData._id, { estimateNumber: customEstimateNumber });
        setEstimateSaved(true);
        setTimeout(() => setEstimateSaved(false), 3000); // Hide success message after 3 seconds
      } catch (error) {
        console.error('Error saving estimate number:', error);
        alert('Failed to save estimate number');
      } finally {
        setIsSavingEstimate(false);
      }
    }
  };

  // Save custom date to database
  const handleDateChange = (value) => {
    // Convert from YYYY-MM-DD (input format) to DD/MM/YYYY (display format)
    if (value) {
      const [year, month, day] = value.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      setCustomDate(formattedDate);
      setDateSaved(false); // Mark as unsaved when changed
    } else {
      setCustomDate('');
      setDateSaved(false);
    }
  };

  // Manual save function for Date
  const saveDate = async () => {
    if (boqData._id) {
      try {
        setIsSavingDate(true);
        await boqAPI.update(boqData._id, { customDate });
        setDateSaved(true);
        setTimeout(() => setDateSaved(false), 3000); // Hide success message after 3 seconds
      } catch (error) {
        console.error('Error saving custom date:', error);
        alert('Failed to save date');
      } finally {
        setIsSavingDate(false);
      }
    }
  };

  // Helper function to convert DD/MM/YYYY to YYYY-MM-DD for date input
  const getDateInputValue = () => {
    if (!customDate) return '';
    const [day, month, year] = customDate.split('/');
    return `${year}-${month}-${day}`;
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
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight,
          onclone: (clonedDoc) => {
            const images = clonedDoc.querySelectorAll('img');
            images.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        // Use fixed A4 dimensions to prevent content cutoff
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
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight,
          onclone: (clonedDoc) => {
            const images = clonedDoc.querySelectorAll('img');
            images.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        // Use fixed A4 dimensions to prevent content cutoff
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

  const defaultDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const currentDate = customDate || defaultDate;
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

  // Calculate totals based on selected scopes
  // Use normalized (lowercase) matching for robustness
  console.log('=== FILTERED ITEMS CALCULATION ===');
  console.log('Selected Scopes:', selectedScopes);
  console.log('All BOQ Items:', boqData.items);
  console.log('Items count:', boqData.items?.length || 0);

  const filteredItems = (boqData.items || []).filter(item =>
    selectedScopes.some(s => normalizeScope(s) === normalizeScope(item.scopeOfWork))
  );

  console.log('Filtered Items:', filteredItems);
  console.log('Filtered Items count:', filteredItems.length);

  const itemsTotal = filteredItems.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0) || 0;

  const transportationCharges = parseFloat(boqData.transportationCharges) || 0;
  const finalTotalWithoutGST = itemsTotal + transportationCharges;

  // Recalculate metrics based on filtered items to ensure PDF consistency
  const discountPercentage = parseFloat(boqData.discountPercentage) || 0;
  const discountAmount = finalTotalWithoutGST * (discountPercentage / 100);

  const totalAfterDiscount = finalTotalWithoutGST - discountAmount;

  const gstPercentage = parseFloat(boqData.gstPercentage) || 18;
  const totalWithGST = totalAfterDiscount * (1 + gstPercentage / 100);

  // --- Pagination Logic ---
  const pages = [];

  // Only generate pages if we have selected scopes, otherwise empty
  if (selectedScopes.length > 0) {
    let currentBlocks = [];
    let currentLoad = 0;
    const maxLoad = 24; // Reduced from 30 to accommodate larger font size and prevent overflow

    // Helper to add block to page
    const addBlock = (block, weight) => {
      // If adding this block exceeds maxLoad
      if (currentLoad + weight > maxLoad) {
        // SPECIAL CASE: If current page ONLY has a header (or is empty), don't break yet.
        // This ensures the scope header is followed by at least one row of content.
        const isOnlyHeader = currentBlocks.length === 1 && currentBlocks[0].type === 'scope_header';

        if (currentBlocks.length > 0 && !isOnlyHeader) {
          pages.push(currentBlocks);
          currentBlocks = [];
          currentLoad = 0;
        }
      }
      currentBlocks.push(block);
      currentLoad += weight;
    };

    // Helper to force new page
    const forceNewPage = () => {
      if (currentBlocks.length > 0) {
        pages.push(currentBlocks);
        currentBlocks = [];
        currentLoad = 0;
      }
    };

    // 1. Summary Table Block
    // Calculate summary weight: Header (2) + Rows (count) + Spacer (1)
    const summaryWeight = 2 + selectedScopes.length + 1;

    // Calculate totals for summary
    // Calculate totals for summary
    const scopeTotals = {};
    selectedScopes.forEach(scope => {
      // Normalized (lowercase) match to handle case differences
      const scopeItems = (boqData.items || []).filter(i =>
        normalizeScope(i.scopeOfWork) === normalizeScope(scope)
      );
      const total = scopeItems.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
      scopeTotals[scope] = total;
    });

    addBlock({ type: 'summary_table', scopes: selectedScopes, totals: scopeTotals }, summaryWeight);

    // 1.1 Totals Section Block (Reduced weight)
    addBlock({
      type: 'totals_section',
      data: {
        finalTotalWithoutGST,
        discountPercentage,
        discountAmount,
        gstPercentage,
        totalWithGST,
        totalAfterDiscount
      }
    }, 3);

    // 1.2 Terms & Conditions Block (Reduced weight factor)
    if (termsAndConditions.length > 0) {
      addBlock({ type: 'terms_section', terms: termsAndConditions }, 1.5 + termsAndConditions.length * 0.3);
    }

    // 1.3 Special Remarks Block (Reduced weight)
    if (boqData.overallRemarks) {
      addBlock({ type: 'remarks_section', remarks: boqData.overallRemarks }, 1.5);
    }

    // 2. Detailed Scope Tables
    selectedScopes.forEach((scope, index) => {
      // Normalized (lowercase) match to handle case differences
      const items = (boqData.items || []).filter(i =>
        normalizeScope(i.scopeOfWork) === normalizeScope(scope)
      );

      if (items.length > 0) {
        // Calculate weight for the first item to see if header + first item fit
        const firstItem = items[0];
        const descLength = firstItem.partName?.length || 0;
        const specLength = firstItem.specification?.length || 0;
        const remarksLength = firstItem.remarks?.length || 0;
        const firstItemWeight = Math.max(2.0, (Math.ceil(Math.max(descLength, specLength, remarksLength) / 35) * 0.9) + (firstItem.image ? 4.5 : 0));

        // If header + first item won't fit, force new page before adding header
        if (currentLoad + 2 + firstItemWeight > maxLoad && currentBlocks.length > 0) {
          forceNewPage();
        }

        // Scope Header
        addBlock({ type: 'scope_header', scope }, 2);

        // Items - reduced weight from 1.5 to 1.0 to fit more items per page
        // Items - weight adjusted based on description, specification, and remarks length to better estimate page space
        items.forEach((item, idx) => {
          const descLength = item.partName?.length || 0;
          const specLength = item.specification?.length || 0;
          const remarksLength = item.remarks?.length || 0;
          // Remarks and Images share a column, so we consider image presence as well
          const hasImageWeight = item.image ? 4 : 0;

          const maxTextLength = Math.max(descLength, specLength, remarksLength);
          const estimatedLines = Math.ceil(maxTextLength / 35); // Estimated chars per line
          const weight = Math.max(2.0, (estimatedLines * 0.9) + (item.image ? 4.5 : 0));

          addBlock({ type: 'item_row', item, index: idx + 1, scope }, weight);
        });

        // Spacer after scope
        addBlock({ type: 'spacer' }, 1);
      }
    });

    if (currentBlocks.length > 0) pages.push(currentBlocks);
  } else {
    // Empty state page
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
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight,
          onclone: clonedDoc => {
            const images = clonedDoc.querySelectorAll('img');
            images.forEach(img => {
              img.crossOrigin = 'anonymous';
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        // Use fixed A4 dimensions to prevent content cutoff
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

        {/* Editable Controls - Only show if showEditableControls is true */}
        {showEditableControls && (
          <div className="p-4 bg-gray-50 border-b overflow-y-auto max-h-[30vh]">
            <div className="flex flex-row justify-between">
              {/* Estimate, Date and Scope grouped Layout */}
              <div className="flex flex-wrap flex-col gap-6 items-start">
                {/* Left Group: Estimate and Date */}
                <div className="flex-1 min-w-[300px] flex flex-row gap-6">
                  {/* Estimate Number Editor */}
                  {showEstimateNumber && (
                    <div>
                      <h3 className="font-semibold mb-3 text-blue-700">Estimate Number</h3>
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={customEstimateNumber}
                            onChange={(e) => handleEstimateNumberChange(e.target.value)}
                            placeholder="Enter Estimate Number (Required)"
                            className="flex-1 p-2 border rounded text-sm"
                          />
                        </div>
                        <button
                          onClick={saveEstimateNumber}
                          disabled={isSavingEstimate || estimateSaved}
                          className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${estimateSaved
                            ? 'bg-green-600 text-white cursor-not-allowed'
                            : isSavingEstimate
                              ? 'bg-blue-400 text-white cursor-wait'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                          {estimateSaved ? (
                            <span className="flex items-center justify-center">
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Saved!
                            </span>
                          ) : isSavingEstimate ? (
                            'Saving...'
                          ) : (
                            'Save Estimate Number'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date Editor */}
                  <div>
                    <h3 className="font-semibold mb-3 text-blue-700">Date</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={getDateInputValue()}
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="flex-1 p-2 border rounded text-sm"
                        />
                        {!customDate && (
                          <span className="text-sm text-blue-600 whitespace-nowrap">
                            Auto: {defaultDate}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={saveDate}
                        disabled={isSavingDate || dateSaved}
                        className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${dateSaved
                          ? 'bg-green-600 text-white cursor-not-allowed'
                          : isSavingDate
                            ? 'bg-blue-400 text-white cursor-wait'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                      >
                        {dateSaved ? (
                          <span className="flex items-center justify-center">
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Saved!
                          </span>
                        ) : isSavingDate ? (
                          'Saving...'
                        ) : (
                          'Save Date'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Group: Scope Selection */}
                <div className="flex-1 min-w-[300px]">
                  {/* Scope of Work Selection */}
                  <div className="relative">
                    <div className="max-h-48 overflow-y-auto p-3 border border-gray-300 rounded-md bg-white hover:border-gray-400 focus-within:border-blue-500 transition-colors duration-200">
                      <div className="flex flex-wrap gap-3">
                        {availableScopes.length > 0 ? (
                          availableScopes.map(scope => (
                            <div key={scope} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`pdf-scope-${scope}`}
                                checked={selectedScopes.includes(scope)}
                                onChange={() => handleScopeSelection(scope)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`pdf-scope-${scope}`} className="ml-2 block text-sm text-gray-700 cursor-pointer">
                                {scope.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No scope of work available</p>
                        )}
                      </div>
                    </div>
                    <label className="absolute -top-2 left-2 text-sm text-blue-600 font-medium bg-white px-1 transition-all duration-200">
                      Scope of Work <span className="text-red-500">*</span>
                    </label>
                    {selectedScopes.length === 0 && (
                      <div className="mt-1 flex items-start">
                        <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 mr-1 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-500">Please select at least one scope of work</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Terms & Conditions Editor */}
              <div className=" w-full ml-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-blue-700">Terms & Conditions</h3>
                  <button
                    onClick={addTerm}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Term
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
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
                <button
                  onClick={saveTermsAndConditions}
                  disabled={isSavingTerms || termsSaved}
                  className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${termsSaved
                    ? 'bg-green-600 text-white cursor-not-allowed'
                    : isSavingTerms
                      ? 'bg-blue-400 text-white cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  {termsSaved ? (
                    <span className="flex items-center justify-center">
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Saved!
                    </span>
                  ) : isSavingTerms ? (
                    'Saving...'
                  ) : (
                    'Save Terms & Conditions'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  fontFamily: '"Bookman Old Style", serif',
                  fontSize: '14px'
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
                  <div className="text-right text-sm leading-tight">
                    <div className="font-semibold text-gray-600">
                      <p>No.166,Sy.No.40/1 ,</p>
                      <p>3rd Phase Obdenahalli Industrial Area,</p>
                      <p>Kasabahobli Doddaballapur</p>
                    </div>
                    <div className="text-gray-600">Bangalore</div>
                    <div className="text-gray-600">Karnataka, Code : 29</div>
                    <div className="text-gray-600">PIN: 561203</div>
                    <div className="mt-1 text-gray-500 text-sm flex items-center gap-2">
                      <span>Ph: {companyInfo.phone}</span>
                      <span className="text-gray-400">|</span>
                      <span>Email: Accounts@voomet.com</span>
                      <span className="text-gray-400">|</span>
                      <span>Web: {companyInfo.website}</span>
                    </div>
                  </div>
                </div>

                {/* Title and Client Info */}
                {/* Title and Client Info - Now only on the first page */}
                {pageIndex === 0 && (
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
                )}

                {/* Dynamic Content Rendering */}
                <div className="mb-4">
                  {pageItems.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500 font-medium">No scopes of work selected.</p>
                      <p className="text-sm text-gray-400 mt-1">Please select at least one scope from the controls above.</p>
                    </div>
                  ) : (
                    pageItems.map((block, index) => {
                      // --- Summary Table ---
                      if (block.type === 'summary_table') {
                        return (
                          <div key={`summary-${index}`} className="mb-8">
                            <div className="bg-gray-600 text-white p-2 mb-0">
                              <h3 className="font-bold text-center text-sm">SUMMARY OF BOQ</h3>
                            </div>
                            <table className="w-full border-collapse border border-blue-800 text-sm">
                              <thead>
                                <tr className="bg-blue-200">
                                  <th className="border border-blue-800 p-2 font-bold text-center w-16">S.NO</th>
                                  <th className="border border-blue-800 p-2 font-bold text-left">SCOPE OF WORK</th>
                                  <th className="border border-blue-800 p-2 font-bold text-right w-40">AMOUNT (₹)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.scopes.map((scope, idx) => (
                                  <tr key={scope}>
                                    <td className="border border-blue-800 p-2 text-center">{idx + 1}</td>
                                    <td className="border border-blue-800 p-2 font-medium">
                                      {scope.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </td>
                                    <td className="border border-blue-800 p-2 text-right font-mono font-bold">
                                      {(block.totals[scope] || 0).toLocaleString('en-IN', {
                                        minimumFractionDigits: 2, maximumFractionDigits: 2
                                      })}
                                    </td>
                                  </tr>
                                ))}
                                {/* Total Row in Summary */}
                                <tr className="bg-blue-50 font-bold">
                                  <td className="border border-blue-800 p-2 text-center" colSpan="2">TOTAL</td>
                                  <td className="border border-blue-800 p-2 text-right font-mono">
                                    {Object.values(block.totals).reduce((a, b) => a + b, 0).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2, maximumFractionDigits: 2
                                    })}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      }

                      // --- Totals Section ---
                      if (block.type === 'totals_section') {
                        const { finalTotalWithoutGST, discountPercentage, discountAmount, gstPercentage, totalWithGST, totalAfterDiscount } = block.data;
                        return (
                          <div key={`totals-${index}`} className="bg-blue-800 text-white mb-4">
                            <div className="grid grid-cols-4">
                              <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">SUBTOTAL (Excl. GST)</div>
                                <div className="text-lg font-bold font-mono">
                                  ₹{finalTotalWithoutGST.toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">Discount - ({discountPercentage}) %</div>
                                <div className="text-lg font-bold font-mono">
                                  ₹{(discountAmount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-3 border-r border-blue-600 text-center">
                                <div className="text-sm font-medium mb-1">GST @ {gstPercentage}%</div>
                                <div className="text-lg font-bold font-mono text-yellow-300">
                                  ₹{((totalWithGST - (finalTotalWithoutGST - (discountAmount || 0))) || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-3 text-center bg-green-600">
                                <div className="text-sm font-medium mb-1">GRAND TOTAL</div>
                                <div className="text-xl font-bold font-mono">
                                  ₹{(totalWithGST || 0)?.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // --- Terms Section ---
                      if (block.type === 'terms_section') {
                        return (
                          <div key={`terms-${index}`} className="mb-4">
                            <div className="bg-blue-50 p-3 border-l-4 border-blue-600">
                              <h4 className="font-bold mb-2 text-blue-800 text-sm">Terms & Conditions:</h4>
                              <div className="text-sm text-blue-700">
                                <ul className="space-y-1">
                                  {block.terms.map((term, idx) => (
                                    <li key={idx}>{term}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // --- Remarks Section ---
                      if (block.type === 'remarks_section') {
                        return (
                          <div key={`remarks-${index}`} className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <h4 className="font-bold mb-1 text-yellow-800 text-sm">Special Remarks:</h4>
                            <p className="text-sm text-yellow-700">{block.remarks}</p>
                          </div>
                        );
                      }

                      // --- Scope Header ---
                      if (block.type === 'scope_header') {
                        return (
                          <div key={`header-${index}`} className="bg-gray-600 text-white p-2 mb-0 mt-6 border border-b-0 border-blue-800">
                            <h3 className="font-bold text-center text-sm">
                              DETAILED QUOTATION - {block.scope.replace(/_/g, ' ').toUpperCase()}
                            </h3>
                          </div>
                        );
                      }

                      // --- Item Table (Grouped) ---
                      if (block.type === 'item_row') {
                        // Only render table start if previous block was NOT an item_row
                        // This prevents creating a new table for every row
                        const isFirstRow = index === 0 || pageItems[index - 1].type !== 'item_row';

                        if (!isFirstRow) return null;

                        // Gather consecutive item rows
                        const items = [];
                        let j = index;
                        while (j < pageItems.length && pageItems[j].type === 'item_row') {
                          items.push(pageItems[j]);
                          j++;
                        }

                        return (
                          <table key={`table-${index}`} className="w-full border-collapse border border-blue-800 text-sm mb-0">
                            <thead>
                              <tr className="bg-blue-200">
                                <th className="border border-blue-800 p-2 font-bold text-center w-12">S.NO</th>
                                <th className="border border-blue-800 p-2 font-bold text-left">DESCRIPTION</th>
                                <th className="border border-blue-800 p-2 font-bold text-center w-24">SPECIFICATION</th>
                                <th className="border border-blue-800 p-2 font-bold text-center w-16">QTY</th>
                                <th className="border border-blue-800 p-2 font-bold text-center w-16">UNIT</th>
                                {hasInOffice && <>
                                  <th className="border border-blue-800 p-2 font-bold text-center w-28">RATE (₹)</th>
                                  <th className="border border-blue-800 p-2 font-bold text-center w-32">AMOUNT (₹)</th>
                                  <th className="border border-blue-800 p-2 font-bold text-center w-40">REMARKS / IMAGE</th>
                                </>}
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((blockItem, itemIdx) => {
                                const item = blockItem.item;
                                return (
                                  <tr key={itemIdx}>
                                    <td className="border border-blue-800 p-3 text-center align-middle font-semibold">
                                      {blockItem.index}
                                    </td>
                                    <td className="border border-blue-800 p-3 align-top">
                                      <div className="font-bold mb-1 text-xs">{item.partName}</div>
                                    </td>
                                    <td className="border border-blue-800 p-3 text-center align-top leading-relaxed">
                                      {item.specification || '-'}
                                    </td>
                                    <td className="border border-blue-800 p-3 text-center align-middle font-mono">
                                      {parseFloat(item.numberOfUnits || 0).toLocaleString()}
                                    </td>
                                    <td className="border border-blue-800 p-3 text-center align-middle">
                                      {item.unitType}
                                    </td>
                                    {hasInOffice && <>
                                      <td className="border border-blue-800 p-3 text-right align-middle font-mono">
                                        {parseFloat(item.unitPrice || 0).toLocaleString('en-IN', {
                                          minimumFractionDigits: 2, maximumFractionDigits: 2
                                        })}
                                      </td>
                                      <td className="border border-blue-800 p-3 text-right align-middle font-mono font-semibold">
                                        {parseFloat(item.totalPrice || 0).toLocaleString('en-IN', {
                                          minimumFractionDigits: 2, maximumFractionDigits: 2
                                        })}
                                      </td>
                                      <td className="border border-blue-800 p-3 text-left align-top">
                                        <div className="mb-3 leading-relaxed">{item.remarks || " "}</div>
                                        {getImageUrl(item.image) && (
                                          <img
                                            src={getImageUrl(item.image)}
                                            alt="Item"
                                            className="w-full h-auto max-h-40 object-contain rounded-md border border-gray-200 shadow-sm"
                                            crossOrigin="anonymous"
                                          />
                                        )}
                                      </td>
                                    </>}
                                  </tr>
                                );
                              })}

                              {/* Transportation Charges Row - Only on last page */}
                              {/* Note: This logic might need adjustment if transportation is per scope, 
                                  but BOQ usually has one total transportation. 
                                  We will render it after the last item of the last scope, 
                                  BUT checking that here is hard. 
                                  We'll leave it to the Totals section for now or standard flow. 
                                  Actually, existing logic put it in the table. 
                                  Since I can't easily detect "Last Item of Last Scope" inside this loop without complex logic,
                                  I will handle it by checking if we are on the last page and this is the last table.
                               */}
                              {pageIndex === pages.length - 1 &&
                                index + items.length >= pageItems.length - 1 && // Is this the last block group? roughly
                                hasInOffice && transportationCharges > 0 && (
                                  <tr className="bg-blue-50">
                                    <td className="border border-blue-800 p-2 font-medium text-right" colSpan="6">
                                      Transportation & Handling Charges
                                    </td>
                                    <td className="border border-blue-800 p-2 text-right font-mono font-semibold">
                                      {transportationCharges.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2, maximumFractionDigits: 2
                                      })}
                                    </td>
                                    <td className="border border-blue-800 p-2" colSpan="1"></td>
                                  </tr>
                                )}

                            </tbody>
                          </table>
                        );
                      }

                      return <div key={`spacer-${index}`} className="h-4"></div>;
                    })
                  )}
                </div>

                {/* Content Removed: Totals, Terms, and Remarks now handled as dynamic blocks */}

                {/* Footer */}
                <div className="mt-6 pt-3 border-t text-center text-sm text-blue-600">
                  <p className="font-medium text-sm">This is a system generated quotation - {currentDate} - Page {pageIndex + 1} of {pages.length}</p>
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
            title: `Bill of Quantities (BOQ)${projectName ? ` - ${projectName}` : ''}`,
            reportType: "Bill of Quantities",
            data: [],
            defaultSubject: `Bill of Quantities (BOQ)${projectName ? ` - ${projectName}` : ''}`
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