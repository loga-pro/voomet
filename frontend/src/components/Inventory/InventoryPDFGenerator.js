import React, { useRef, useEffect, useState } from 'react';

const InventoryPDFGenerator = ({ inventoryData, onComplete, onError }) => {
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

  // Format currency values
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₹0';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format work category
  const formatWorkCategory = (category) => {
    if (!category) return '-';
    // Remove special characters and capitalize first word only
    const cleaned = category.replace(/_/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '');
    const words = cleaned.split(' ');
    return words.map((word, index) => 
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()
    ).join(' ');
  };

  // Process inventory data
  const processInventoryData = () => {
    if (!inventoryData || inventoryData.length === 0) return [];

    return inventoryData.map(item => {
      // Extract vendor names
      let vendorNames = '-';
      if (item.rowData && item.rowData[0] && item.rowData[0].vendorNames) {
        vendorNames = Array.isArray(item.rowData[0].vendorNames) 
          ? item.rowData[0].vendorNames.join(', ') 
          : item.rowData[0].vendorNames;
      } else if (item.customerVendorName) {
        vendorNames = item.customerVendorName;
      }

      // Extract category
      let category = '-';
      if (item.rowData && item.rowData[0] && item.rowData[0].category) {
        category = item.rowData[0].category;
      }

      return {
        workCategory: formatWorkCategory(item.workCategory),
        itemName: item.partName || '-',
        category: category,
        vendorName: vendorNames,
        reOrderLevel: item.reOrderLevel || 0,
        stockAtFactory: item.stockAtFactory || 0,
        stockValueAtFactory: item.stockValueAtFactory || 0,
        stockSentToCustomer: item.stockSentToCustomer || 0,
        stockValueSentToCustomer: item.stockValueSentToCustomer || 0,
        stockReturnFromCustomer: item.stockReturnFromCustomer || 0,
        stockValueReturnFromCustomer: item.stockValueReturnFromCustomer || 0,
        stockReturnToVendor: item.stockReturnToVendor || 0,
        stockValueReturnToVendor: item.stockValueReturnToVendor || 0,
        stockReject: item.stockReject || 0,
        stockValueReject: item.stockValueReject || 0,
        totalStock: item.totalStock || 0,
        totalStockValue: item.totalStockValue || 0
      };
    });
  };

  const processedData = processInventoryData();

  // Calculate totals
  const calculateTotals = () => {
    const totals = {
      totalItems: processedData.length,
      stockAtFactory: 0,
      stockValueAtFactory: 0,
      stockSentToCustomer: 0,
      stockValueSentToCustomer: 0,
      stockReturnFromCustomer: 0,
      stockValueReturnFromCustomer: 0,
      stockReturnToVendor: 0,
      stockValueReturnToVendor: 0,
      stockReject: 0,
      stockValueReject: 0,
      totalStock: 0,
      totalStockValue: 0
    };

    processedData.forEach(item => {
      totals.stockAtFactory += item.stockAtFactory;
      totals.stockValueAtFactory += item.stockValueAtFactory;
      totals.stockSentToCustomer += item.stockSentToCustomer;
      totals.stockValueSentToCustomer += item.stockValueSentToCustomer;
      totals.stockReturnFromCustomer += item.stockReturnFromCustomer;
      totals.stockValueReturnFromCustomer += item.stockValueReturnFromCustomer;
      totals.stockReturnToVendor += item.stockReturnToVendor;
      totals.stockValueReturnToVendor += item.stockValueReturnToVendor;
      totals.stockReject += item.stockReject;
      totals.stockValueReject += item.stockValueReject;
      totals.totalStock += item.totalStock;
      totals.totalStockValue += item.totalStockValue;
    });

    return totals;
  };

  const totals = calculateTotals();

  // Generate PDF in background
  const generatePDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;

      // A3 Landscape dimensions
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });
      
      const element = contentRef.current;

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 1500));

      // A3 landscape dimensions in pixels at 96 DPI
      const a3WidthMM = 420;
      const a3HeightMM = 297;
      
      const canvas = await html2canvas(element, {
        scale: 2.5, // Higher scale for better quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        imageTimeout: 30000,
        logging: false,
        windowWidth: 1587, // A3 width in pixels at 96 DPI (420mm * 3.7795)
        windowHeight: 1122, // A3 height in pixels at 96 DPI (297mm * 3.7795)
        onclone: (clonedDoc) => {
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            img.crossOrigin = 'anonymous';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = a3WidthMM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Add additional pages if content is too long
      let heightLeft = imgHeight - a3HeightMM;
      let position = 0;

      while (heightLeft > 0) {
        position = -(a3HeightMM * Math.ceil((imgHeight - heightLeft) / a3HeightMM));
        pdf.addPage('a3', 'landscape');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= a3HeightMM;
      }

      const fileName = `inventory-report_${currentDate.replace(/\//g, '-')}.pdf`;
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

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
      <div
        ref={contentRef}
        style={{
          width: '420mm', // A3 landscape
          minHeight: '297mm',
          fontFamily: 'Arial, sans-serif',
          fontSize: '9px',
          lineHeight: '1.3',
          margin: '0 auto',
          padding: '15mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Header Section */}
        <div style={{
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '3px solid #1e40af',
          position: 'relative'
        }}>
          {/* Top Row: Logo (Left) and REPORT (Right) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
            {/* Logo - Left Corner */}
            <div style={{ flex: '0 0 auto' }}>
              {logoLoaded ? (
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  style={{
                    height: '45px',
                    width: 'auto',
                    maxWidth: '90px',
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
                  height: '45px',
                  width: '45px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe'
                }}>
                  <span style={{ color: '#1e40af', fontWeight: 'bold', fontSize: '18px' }}>V</span>
                </div>
              )}
            </div>

            {/* REPORT - Right Corner */}
            <div style={{
              backgroundColor: '#1e40af',
              color: '#ffffff',
              padding: '8px 20px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '14px',
              letterSpacing: '1px'
            }}>
              REPORT
            </div>
          </div>

          {/* Company Name - Centered */}
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '800',
              color: '#1e3a8a',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '1.5px'
            }}>
              {companyInfo.name}
            </h1>
          </div>

          {/* Contact Info - Single Line */}
          <div style={{ 
            fontSize: '10px', 
            color: '#4b5563',
            textAlign: 'center',
            marginBottom: '6px'
          }}>
            Phone: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.phone}</span> | Email: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.email}</span> | Website: <span style={{ color: '#111827', fontWeight: '500' }}>{companyInfo.website}</span>
          </div>

          {/* Generated On */}
          <div style={{ 
            fontSize: '8px', 
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center',
            marginTop: '4px'
          }}>
            Report Generated On: {currentDate} at {currentTime}
          </div>
        </div>

        {/* Report Title */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '800',
            color: '#1e3a8a',
            marginBottom: '12px',
            textAlign: 'center',
            paddingBottom: '8px',
            borderBottom: '1px solid #bfdbfe'
          }}>
            Inventory Details
          </h2>

          {/* Summary Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '15px'
          }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '10px 20px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '10px', marginBottom: '4px' }}>
                Total Items
              </div>
              <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>
                {totals.totalItems}
              </div>
            </div>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '10px 20px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '10px', marginBottom: '4px' }}>
                Total Stock
              </div>
              <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>
                {totals.totalStock}
              </div>
            </div>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '10px 20px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '10px', marginBottom: '4px' }}>
                Total Stock Value
              </div>
              <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>
                {formatCurrency(totals.totalStockValue)}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        {processedData.length > 0 ? (
          <div style={{ width: '100%', overflow: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #9ca3af',
              fontSize: '8px',
              tableLayout: 'fixed'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb' }}>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Work<br/>Category</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Item<br/>Name</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Categ<br/>ory</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Vendor<br/>Name</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Re-order<br/>Level</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock at<br/>Factory</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Value<br/>at Factory<br/>(₹)</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Sent<br/>to Customer</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Value<br/>Sent to Custo<br/>mer (₹)</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Return<br/>from Custo<br/>mer</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Value<br/>Return from<br/>Customer (₹)</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Return<br/>to Vendor</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Value<br/>Return to<br/>Vendor (₹)</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock<br/>Reject</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Stock Value<br/>Reject (₹)</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Total<br/>Stock</th>
                  <th style={{
                    border: '1px solid #6b7280',
                    padding: '6px 3px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1e3a8a',
                    fontSize: '7px',
                    backgroundColor: '#dbeafe',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.2'
                  }}>Total Stock<br/>Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((item, index) => (
                  <tr
                    key={index}
                    style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb' }}
                  >
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>{item.workCategory}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>{item.itemName}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>{item.category}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>{item.vendorName}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.reOrderLevel}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.stockAtFactory}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{formatCurrency(item.stockValueAtFactory)}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.stockSentToCustomer}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{formatCurrency(item.stockValueSentToCustomer)}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.stockReturnFromCustomer}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{formatCurrency(item.stockValueReturnFromCustomer)}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.stockReturnToVendor}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{formatCurrency(item.stockValueReturnToVendor)}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{item.stockReject}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center'
                    }}>{formatCurrency(item.stockValueReject)}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>{item.totalStock}</td>
                    <td style={{
                      border: '1px solid #d1d5db',
                      padding: '4px 2px',
                      fontSize: '7px',
                      color: '#374151',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>{formatCurrency(item.totalStockValue)}</td>
                  </tr>
                ))}
                
                {/* Totals Row */}
                <tr style={{ backgroundColor: '#dbeafe', fontWeight: 'bold' }}>
                  <td colSpan="5" style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>TOTAL</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.stockAtFactory}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.stockValueAtFactory)}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.stockSentToCustomer}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.stockValueSentToCustomer)}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.stockReturnFromCustomer}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.stockValueReturnFromCustomer)}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.stockReturnToVendor}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.stockValueReturnToVendor)}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.stockReject}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.stockValueReject)}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{totals.totalStock}</td>
                  <td style={{
                    border: '1px solid #6b7280',
                    padding: '5px 3px',
                    fontSize: '7px',
                    color: '#1e3a8a',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>{formatCurrency(totals.totalStockValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '30px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ color: '#6b7280', fontSize: '12px' }}>No inventory data available</div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          paddingTop: '15px',
          borderTop: '2px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '8px',
          color: '#9ca3af'
        }}>
          <div>© {new Date().getFullYear()} {companyInfo.name}. All rights reserved.</div>
          <div style={{ marginTop: '4px' }}>This is a computer-generated document and does not require a signature.</div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPDFGenerator;
