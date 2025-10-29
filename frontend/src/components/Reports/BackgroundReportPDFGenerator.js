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
          { key: 'scopeOfWork', displayName: 'Scope of Work' },
          { key: 'partName', displayName: 'Part Name' },
          { key: 'partPrice', displayName: 'Part Price (₹)' },
          { key: 'cumulativeQuantityAtVoomet', displayName: 'Cumulative Quantity' },
          { key: 'dateOfReceipt', displayName: 'Date of Receipt' }
        ]
      },
      quality: {
        headers: [
          { key: 'customer', displayName: 'Customer' },
          { key: 'scopeOfWork', displayName: 'Scope of Work' },
          { key: 'category', displayName: 'Category' },
          { key: 'status', displayName: 'Status' },
          { key: 'responsibility', displayName: 'Responsibility' },
          { key: 'createdAt', displayName: 'Created Date' }
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
          { key: 'customerName', displayName: 'Customer Name' },
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
          { key: 'customer', displayName: 'Customer' },
          { key: 'projectName', displayName: 'Project Name' },
          { key: 'startDate', displayName: 'Start Date' },
          { key: 'endDate', displayName: 'End Date' },
          { key: 'projectStatus', displayName: 'Status' }
        ]
      },
      payment: {
        headers: [
          { key: 'customer', displayName: 'Customer' },
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
            scopeOfWork: ['scopeOfWork', 'scope_of_work'],
            partName: ['partName', 'part_name'],
            partPrice: ['partPrice', 'part_price', 'price'],
            cumulativeQuantityAtVoomet: ['cumulativeQuantityAtVoomet', 'cumulative_quantity', 'quantity'],
            dateOfReceipt: ['dateOfReceipt', 'date_of_receipt', 'receiptDate'],
            customer: ['customer', 'customerName', 'clientName'],
            category: ['category', 'type'],
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
            balanceAmount: ['balanceAmount', 'balance', 'remainingAmount'],
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
        } else if (key === 'scopeOfWork' && value) {
          value = value.replace(/_/g, ' ').toUpperCase();
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
        } else {
          value = value || '-';
        }
        
        row[key] = value;
      });
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
          width: '210mm', 
          minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.4',
          margin: '0 auto',
          padding: '15mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '20px', 
          paddingBottom: '10px', 
          borderBottom: '2px solid #1f2937'
        }}>
          {/* Left: Company Logo */}
          <div style={{ flexShrink: 0 }}>
            {logoLoaded ? (
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                style={{ 
                  height: '60px',
                  width: 'auto',
                  maxWidth: '120px',
                  objectFit: 'contain',
                  imageRendering: 'crisp-edges'
                }}
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.style.display = 'none';
                  setLogoLoaded(false);
                }}
              />
            ) : (
              <div style={{
                height: '60px',
                width: '60px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: '1px solid #93c5fd'
              }}>
                <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>V</span>
              </div>
            )}
          </div>

          {/* Center: Company Name and Info */}
          <div style={{ textAlign: 'center', flex: 1, margin: '0 20px' }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#111827', 
              margin: '0 0 5px 0' 
            }}>
              {companyInfo.name}
            </h1>
            <div style={{ 
              fontSize: '11px', 
              color: '#4b5563', 
              fontWeight: '600',
              marginBottom: '5px'
            }}>
              CONSTRUCTION & PROJECT MANAGEMENT
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>
              <div>Phone: {companyInfo.phone} | Email: {companyInfo.email}</div>
              <div>Website: {companyInfo.website}</div>
            </div>
          </div>

          {/* Right: Date and Time */}
          <div style={{ textAlign: 'right', fontSize: '11px', flexShrink: 0 }}>
            <div style={{ fontWeight: '600', color: '#374151' }}>Generated On:</div>
            <div style={{ color: '#6b7280' }}>Date: {currentDate}</div>
            <div style={{ color: '#6b7280' }}>Time: {currentTime}</div>
          </div>
        </div>

        {/* Report Title and Info */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: '15px', 
            textAlign: 'center',
            paddingBottom: '8px',
            borderBottom: '1px solid #d1d5db'
          }}>
            {reportTitle}
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
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
              <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '11px' }}>Total Records</div>
              <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '12px' }}>{stats.totalRecords}</div>
            </div>
            {stats.totalValue > 0 && (
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
            )}
          </div>
        </div>

        {/* Report Data Table */}
        {rows.length > 0 ? (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#1f2937', 
              marginBottom: '12px' 
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
                          textAlign: 'left',
                          fontWeight: 'bold',
                          color: '#374151',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
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
                            padding: '6px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
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