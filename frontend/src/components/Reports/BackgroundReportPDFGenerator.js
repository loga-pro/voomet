import React, { useRef, useEffect, useState } from 'react';

const BackgroundReportPDFGenerator = ({ reportData, reportType, reportTitle, onComplete, onError }) => {
  const contentRef = useRef();
  const [companyLogo] = useState('/images/voomet-logo.png');
  const [logoLoaded, setLogoLoaded] = useState(false);

  const companyInfo = {
    name: 'VOOMET',
    phone: '+91 90450 76578',
    email: 'info@voomet.com',
    website: 'www.voomet.com',
  };

  // Pre-load logo
  useEffect(() => {
    const img = new Image();
    img.src = companyLogo;
    img.onload = () => setLogoLoaded(true);
    img.onerror = () => setLogoLoaded(false);
  }, [companyLogo]);

  // Get current date and time
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Get report statistics - UPDATED for your data structure
  const getReportStats = () => {
    if (!reportData || reportData.length === 0) return { totalRecords: 0, totalValue: 0 };

    let totalValue = 0;
    let totalRecords = reportData.length;

    reportData.forEach(item => {
      let value = 0;

      // Calculate total value based on report type
      if (reportType === 'inventory') {
        const price = item.partPrice || item.part_price || item.price || 0;
        const quantity = item.cumulativeQuantityAtVoomet || item.cumulative_quantity || item.quantity || 1;
        value = price * quantity;
      } else if (reportType === 'vendor') {
        value = item.totalInvoiceRaised || item.totalInvoice || item.invoiceAmount || 0;
      } else if (reportType === 'payment') {
        value = item.projectCost || item.totalInvoiceRaised || 0;
      } else {
        // Default for project, milestone, quality reports
        value = item.totalValue || item.totalProjectValue || item.roleValue || item.totalAmount || 0;
      }

      // Clean and convert currency string to number
      if (typeof value === 'string') {
        // Remove currency symbols and commas, then convert to number
        const cleanValue = value.replace(/[₹€£,]/g, '').trim();
        totalValue += parseFloat(cleanValue) || 0;
      } else {
        totalValue += value || 0;
      }
    });

    return {
      totalRecords,
      totalValue: totalValue
    };
  };

  const stats = getReportStats();

  // Format currency values - IMPROVED to handle existing formatted values
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';

    // If already formatted with currency symbol, return as is
    if (typeof value === 'string' && (value.includes('₹') || value.includes('€') || value.includes('£'))) {
      return value;
    }

    // Convert to number and format
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    return `₹${numValue.toLocaleString('en-IN')}`;
  };

  // Format percentage values
  const formatPercentage = (value) => {
    if (!value && value !== 0) return '-';

    // If already formatted with %, return as is
    if (typeof value === 'string' && value.includes('%')) {
      return value;
    }

    // Handle string percentages
    const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
    return `${numValue}%`;
  };

  // Custom table headers and data mapping based on report type
  const getTableData = () => {
    if (!reportData || reportData.length === 0) return { headers: [], rows: [] };

    // Define report-specific configurations
    const reportConfigs = {
      inventory: {
        headers: [
          { key: 'workCategory', displayName: 'Work Category' },
          { key: 'partName', displayName: 'Item Name' },
          { key: 'category', displayName: 'Category' },
          { key: 'vendorName', displayName: 'Vendor Name' },
          { key: 'reOrderLevel', displayName: 'Re-order Level' },
          { key: 'stockAtFactory', displayName: 'Stock at Factory' },
          { key: 'stockValueAtFactory', displayName: 'Stock Value at Factory (₹)' },
          { key: 'stockSentToCustomer', displayName: 'Stock Sent to Customer' },
          { key: 'stockValueSentToCustomer', displayName: 'Stock Value Sent to Customer (₹)' },
          { key: 'stockReturnFromCustomer', displayName: 'Stock Return from Customer' },
          { key: 'stockValueReturnFromCustomer', displayName: 'Stock Value Return from Customer (₹)' },
          { key: 'stockReturnToVendor', displayName: 'Stock Return to Vendor' },
          { key: 'stockValueReturnToVendor', displayName: 'Stock Value Return to Vendor (₹)' },
          { key: 'stockReject', displayName: 'Stock Reject' },
          { key: 'stockValueReject', displayName: 'Stock Value Reject (₹)' },
          { key: 'totalStock', displayName: 'Total Stock' },
          { key: 'totalStockValue', displayName: 'Total Stock Value (₹)' }
        ]
      },
      quality: {
        headers: [
          { key: 'customer', displayName: 'Client Name' },
          { key: 'scopeOfWork', displayName: 'Scope of Work' },
          { key: 'category', displayName: 'Category' },
          { key: 'status', displayName: 'Status' },
          { key: 'responsibility', displayName: 'Responsibility' },
        ]
      },
      vendor: {
        headers: [
          { key: 'vendor', displayName: 'Vendor' },
          { key: 'vendorGstNumber', displayName: 'GST Number' },
          { key: 'totalInvoiceRaised', displayName: 'Total Invoice Raised (₹)' },
          { key: 'totalPayments', displayName: 'Total Payments (₹)' },
          { key: 'balanceAmount', displayName: 'Balance (₹)' },
          { key: 'status', displayName: 'Status' }
        ]
      },
      'project-comprehensive': {
        headers: [
          { key: 'customerName', displayName: 'Client Name' },
          { key: 'projectName', displayName: 'Project Name' },
          { key: 'stage', displayName: 'Stage' },
          { key: 'totalProjectValue', displayName: 'Total Value (₹)' },
          { key: 'invoiceRaised', displayName: 'Invoice Raised (₹)' },
          { key: 'paymentReceived', displayName: 'Payment Received (₹)' },
          { key: 'balanceAmount', displayName: 'Balance Amount (₹)' },
          { key: 'taskCompleted', displayName: 'Task Completed' },
          { key: 'milestoneCompletion', displayName: 'Milestone Completion' },
          { key: 'enquiryDate', displayName: 'Enquiry Date' }
        ]
      },
      milestone: {
        headers: [
          { key: 'customer', displayName: 'Client Name' },
          { key: 'projectName', displayName: 'Project Name' },
          { key: 'startDate', displayName: 'Start Date' },
          { key: 'endDate', displayName: 'End Date' },
        ]
      },
      payment: {
        headers: [
          { key: 'customer', displayName: 'Client Name' },
          { key: 'projectName', displayName: 'Project Name' },
          { key: 'projectCost', displayName: 'Project Cost (₹)' },
          { key: 'totalInvoiceRaised', displayName: 'Total Invoice Raised (₹)' },
          { key: 'totalPayments', displayName: 'Total Payments (₹)' },
          { key: 'balanceAmount', displayName: 'Balance (₹)' },
          { key: 'status', displayName: 'Status' }
        ]
      }
    };

    // Get the configuration for the current report type
    const config = reportConfigs[reportType] || reportConfigs['project-comprehensive'];
    const headers = config.headers;

    // Format row data based on report type
    const rows = reportData.map(item => {
      const row = {};

      headers.forEach(({ key }) => {
        let value = item[key];

        // Handle alternative field names for different report types
        if (!value && value !== 0) {
          const altKeys = {
            workCategory: ['workCategory', 'scopeOfWork', 'scope_of_work'],
            scopeOfWork: ['scopeOfWork', 'workCategory', 'scope_of_work'],
            partName: ['partName', 'part_name'],
            partPrice: ['partPrice', 'part_price', 'price'],
            category: ['category', 'type'],
            vendorName: ['vendorName', 'customerVendorName', 'vendor', 'vendorNames'],
            reOrderLevel: ['reOrderLevel', 're_order_level', 'reorder_level'],
            stockAtFactory: ['stockAtFactory', 'stock_at_factory'],
            stockValueAtFactory: ['stockValueAtFactory', 'stock_value_at_factory'],
            stockSentToCustomer: ['stockSentToCustomer', 'stock_sent_to_customer'],
            stockValueSentToCustomer: ['stockValueSentToCustomer', 'stock_value_sent_to_customer'],
            stockReturnFromCustomer: ['stockReturnFromCustomer', 'stock_return_from_customer'],
            stockValueReturnFromCustomer: ['stockValueReturnFromCustomer', 'stock_value_return_from_customer'],
            stockReturnToVendor: ['stockReturnToVendor', 'stock_return_to_vendor'],
            stockValueReturnToVendor: ['stockValueReturnToVendor', 'stock_value_return_to_vendor'],
            stockReject: ['stockReject', 'stock_reject', 'stockRejected'],
            stockValueReject: ['stockValueReject', 'stock_value_reject', 'stockValueRejected'],
            totalStock: ['totalStock', 'total_stock'],
            totalStockValue: ['totalStockValue', 'total_stock_value'],
            cumulativeQuantityAtVoomet: ['cumulativeQuantityAtVoomet', 'cumulative_quantity', 'quantity'],
            dateOfReceipt: ['dateOfReceipt', 'date_of_receipt', 'receiptDate'],
            customer: ['customer', 'customerName', 'clientName'],
            status: ['status', 'state'],
            responsibility: ['responsibility', 'assignedTo'],
            createdAt: ['createdAt', 'created_at', 'dateCreated'],
            vendor: ['vendor', 'vendorName', 'supplier'],
            vendorGstNumber: ['vendorGstNumber', 'gstNumber', 'gst'],
            totalInvoiceRaised: ['totalInvoiceRaised', 'totalInvoice', 'invoiceAmount'],
            totalPayments: ['totalPayments', 'payments', 'paidAmount'],
            balanceAmount: ['balanceAmount', 'balance', 'remainingAmount'],
            projectName: ['projectName', 'project_name', 'name'],
            customerName: ['customerName', 'customer_name', 'clientName'],
            stage: ['stage', 'projectStage', 'currentStage'],
            totalProjectValue: ['totalProjectValue', 'totalValue', 'projectValue'],
            invoiceRaised: ['invoiceRaised', 'totalInvoiceRaised', 'totalInvoice', 'invoiceAmount'],
            paymentReceived: ['paymentReceived', 'totalPaymentReceived', 'payments', 'paidAmount'],
            taskCompleted: ['taskCompleted', 'taskCompletion', 'completedTasks'],
            milestoneCompletion: ['milestoneCompletion', 'milestoneCompletionRate', 'completionRate'],
            enquiryDate: ['enquiryDate', 'enquiry_date', 'startDate'],
            startDate: ['startDate', 'start_date'],
            endDate: ['endDate', 'end_date'],
            projectStatus: ['projectStatus', 'status', 'project_status']
          };

          const alternatives = altKeys[key] || [key];
          for (let altKey of alternatives) {
            if (item[altKey] !== undefined && item[altKey] !== null) {
              value = item[altKey];
              break;
            }
          }
        }

        // Format specific fields based on key patterns
        if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('payment') || key.toLowerCase().includes('invoice')) {
          value = formatCurrency(value);
        } else if (key.toLowerCase().includes('date')) {
          if (value) {
            const date = new Date(value);
            value = date.toLocaleDateString('en-IN');
          } else {
            value = '-';
          }
        } else if ((key === 'scopeOfWork' || key === 'workCategory') && value && typeof value === 'string') {
          value = value.replace(/_/g, ' ').toUpperCase();
        } else if (key === 'vendorName' || key === 'vendor') {
          // Handle vendorName which might be an array, object, or in rowData
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // If it's an object (like vendor details), extract the name
            value = value.vendorName || value.name || '-';
          } else if (Array.isArray(value)) {
            value = value.map(v => typeof v === 'object' ? (v.vendorName || v.name || v) : v).join(', ');
          } else if (!value && item.rowData?.[0]?.vendorNames) {
            value = Array.isArray(item.rowData[0].vendorNames)
              ? item.rowData[0].vendorNames.join(', ')
              : item.rowData[0].vendorNames;
          } else if (!value) {
            value = item.customerVendorName || '-';
          }
        } else if (key === 'category' && !value) {
          // Try to get category from rowData
          value = item.rowData?.[0]?.category || '-';
        } else if (key === 'taskCompleted') {
          // Format task completion as "completed/total"
          if (value && typeof value === 'string' && value.includes('/')) {
            value = value; // Already formatted
          } else if (value && typeof value === 'object' && value.completed !== undefined && value.total !== undefined) {
            value = `${value.completed}/${value.total}`;
          } else {
            // Try to extract from milestone data or other sources
            const completedTasks = item.completedTasks || item.completed_tasks || 0;
            const totalTasks = item.totalTasks || item.total_tasks || item.tasks?.length || 0;
            if (completedTasks || totalTasks) {
              value = `${completedTasks}/${totalTasks}`;
            } else {
              value = value || '-';
            }
          }
        } else if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        } else if (typeof value === 'object' && value !== null) {
          // Handle any remaining objects by converting to string or extracting name
          if (value.name) {
            value = value.name;
          } else if (value.vendorName) {
            value = value.vendorName;
          } else if (value.toString && value.toString() !== '[object Object]') {
            value = value.toString();
          } else {
            value = '-';
          }
        } else {
          // Handle 0 values properly - only use '-' for null/undefined
          value = (value !== null && value !== undefined) ? value : '-';
        }

        // Final safety check: ensure we never assign an object to a table cell
        if (typeof value === 'object' && value !== null) {
          console.warn(`Object value detected for key "${key}":`, value);
          
          // Try to extract meaningful data from the object
          if (Array.isArray(value)) {
            // Handle arrays
            value = value.map(v => {
              if (typeof v === 'object' && v !== null) {
                return v.vendorName || v.name || v._id || JSON.stringify(v);
              }
              return v;
            }).join(', ');
          } else {
            // Handle objects - try multiple common fields
            value = value.vendorName || value.name || value._id || 
                   (value.toString && value.toString() !== '[object Object]' ? value.toString() : JSON.stringify(value));
          }
        }

        // Extra safety: ensure the final value is a primitive
        if (typeof value === 'object' && value !== null) {
          value = String(value);
        }

        row[key] = value;
      });

      // Add tasks data for milestone reports
      if (reportType === 'milestone' && item.tasks && item.tasks.length > 0) {
        row._tasks = item.tasks;
      }

      return row;
    });

    return { headers, rows };
  };

  const { headers, rows } = getTableData();

  // Generate PDF in background
  const generatePDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      const pdf = new jsPDF('p', 'mm', 'a4');
      // const pdf = new jsPDF('l', 'mm', 'a3');
      const element = contentRef.current;

      // Wait a bit for content to render properly
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        imageTimeout: 30000,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        onclone: (clonedDoc) => {
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;


      // Add first page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Add additional pages if content is too long
      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 297; // A4 height in mm

      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `${reportType}-report_${currentDate.replace(/\//g, '-')}.pdf`;
      const pdfBlob = pdf.output('blob');

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
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // DEBUG: Log the data to see what we're working with
  useEffect(() => {
    console.log('Report Data:', reportData);
    console.log('Processed Headers:', headers);
    console.log('Processed Rows:', rows);
  }, [reportData, headers, rows]);

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
      <div
        ref={contentRef}
        style={{
          width: '210mm', // A4
          minHeight: '297mm', // A4
          // width: '420mm', 
          // minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '10px',
          lineHeight: '1.3',
          margin: '0 auto',
          padding: '10mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header Section */}
        <div style={{
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '3px solid #1e40af', // Premium blue accent
          position: 'relative'
        }}>
          {/* Top Row: Logo (Left) and REPORT (Right) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '15px'
          }}>
            {/* Logo - Left Corner */}
            <div style={{ flex: '0 0 auto' }}>
              {logoLoaded ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{
                    height: '50px',
                    width: 'auto',
                    maxWidth: '100px',
                    objectFit: 'contain'
                  }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    setLogoLoaded(false);
                  }}
                />
              ) : (
                <div style={{
                  height: '50px',
                  width: '50px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  <span style={{ color: '#1e40af', fontWeight: 'bold', fontSize: '20px' }}>V</span>
                </div>
              )}
            </div>
          </div>

          {/* Company Name - Centered */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#1e3a8a',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {companyInfo.name}
            </h1>
          </div>

          {/* Contact Info - Single Line */}
          <div style={{ 
            fontSize: '11px', 
            color: '#4b5563',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            Phone: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.phone}</span> | Email: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.email}</span> | Website: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.website}</span>
          </div>

          {/* Generated On */}
          <div style={{ 
            fontSize: '9px', 
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center',
            marginTop: '5px'
          }}>
            Report Generated On: {currentDate} at {currentTime}
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '800',
            color: '#1e3a8a',
            marginBottom: '15px',
            textAlign: 'center',
            paddingBottom: '10px',
            borderBottom: '1px solid #bfdbfe',
            textTransform: 'capitalize'
          }}>
            {reportTitle}
          </h2>

          {stats.totalValue > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              maxWidth: '200px',
              margin: '0 auto'
            }}>
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '11px' }}>
                  {reportType === 'inventory' ? 'Total Inventory Value' :
                    reportType === 'vendor' ? 'Total Invoice Amount' :
                      reportType === 'payment' ? 'Total Project Cost' :
                        'Total Project Value'}
                </div>
                <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '12px' }}>
                  {formatCurrency(stats.totalValue)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Data Table */}
        {rows.length > 0 ? (
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              {reportType === 'inventory' ? 'Inventory Details' :
                reportType === 'quality' ? 'Quality Details' :
                  reportType === 'vendor' ? 'Vendor Details' :
                    reportType === 'payment' ? 'Payment Details' :
                      reportType === 'milestone' ? 'Milestone Details' :
                        'Project Details'}
            </h3>
            <div style={{ width: '100%', overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #d1d5db',
                fontSize: '10px',
                tableLayout: 'fixed'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#e5e7eb' }}>
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        style={{
                          border: '1px solid #9ca3af',
                          padding: '8px 6px',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: '#1e3a8a',
                          fontSize: '9px',
                          backgroundColor: '#f1f5f9',
                          whiteSpace: 'normal',
                          wordWrap: 'break-word',
                          width: reportType === 'milestone' ? 
                            (header.key === 'customer' ? '25%' : 
                             header.key === 'projectName' ? '45%' : 
                             header.key === 'startDate' ? '15%' : 
                             header.key === 'endDate' ? '15%' : 'auto') : 'auto'
                        }}
                      >
                        {header.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      style={{ backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                    >
                      {headers.map((header, colIndex) => (
                        <td
                          key={colIndex}
                          style={{
                            border: '1px solid #d1d5db',
                            padding: '6px 5px',
                            fontSize: '9px',
                            color: '#374151',
                            textAlign: 'center',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            verticalAlign: 'middle'
                          }}
                        >
                          {row[header.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>No data available for this report</div>
          </div>
        )}

        {/* Project Tasks Section - Only for milestone reports */}
        {reportType === 'milestone' && reportData.some(item => item.tasks && item.tasks.length > 0) && (
          <div style={{ marginTop: '15px' }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid #d1d5db'
            }}>
              Project Tasks
            </h3>
            {reportData.map((item, itemIndex) => {
              if (!item.tasks || item.tasks.length === 0) return null;

              return (
                <div key={itemIndex} style={{ marginBottom: '12px' }}>
                  <h4 style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    {item.projectName || item.name || `Project ${itemIndex + 1}`}
                  </h4>
                  <div style={{ width: '100%', overflow: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #d1d5db',
                      fontSize: '10px',
                      tableLayout: 'fixed',
                      marginBottom: '10px'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#e5e7eb' }}>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '14%'
                          }}>Phase</th>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '28%'
                          }}>Task</th>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '10%'
                          }}>Duration</th>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '14%'
                          }}>Start Date</th>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '14%'
                          }}>End Date</th>
                          <th style={{
                            border: '1px solid #9ca3af',
                            padding: '6px 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            color: '#1e3a8a',
                            fontSize: '9px',
                            backgroundColor: '#f1f5f9',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            width: '20%'
                          }}>Responsible Person</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.tasks.map((task, taskIndex) => (
                          <tr
                            key={taskIndex}
                            style={{ backgroundColor: taskIndex % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                          >
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              verticalAlign: 'middle'
                            }}>
                              {task.phase || '-'}
                            </td>
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              verticalAlign: 'middle'
                            }}>
                              {task.task || '-'}
                            </td>
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle'
                            }}>
                              {task.duration || 0} day{task.duration !== 1 ? 's' : ''}
                            </td>
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle'
                            }}>
                              {task.startDate ? new Date(task.startDate).toLocaleDateString('en-IN') : '-'}
                            </td>
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle'
                            }}>
                              {task.endDate ? new Date(task.endDate).toLocaleDateString('en-IN') : '-'}
                            </td>
                            <td style={{
                              border: '1px solid #d1d5db',
                              padding: '5px 4px',
                              fontSize: '9px',
                              color: '#374151',
                              textAlign: 'center',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              verticalAlign: 'middle'
                            }}>
                              {task.responsiblePerson || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '30px',
          paddingTop: '15px',
          borderTop: '1px solid #d1d5db',
          fontSize: '10px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '4px' }}>Generated by VOOMET Project Management System</div>
          <div>This is a computer-generated report and does not require signature</div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundReportPDFGenerator;