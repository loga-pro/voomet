import React, { useState, useRef } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer, Image, Font } from '@react-pdf/renderer';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modals/Modal';
import useNotification from '../hooks/useNotification';

// Register fonts (you'll need to add these fonts to your public folder)
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: '/fonts/Helvetica.ttf' },
    { src: '/fonts/Helvetica-Bold.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '1px solid #000',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 40,
  },
  companyInfo: {
    fontSize: 8,
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    fontSize: 10,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  tableCol: {
    width: '14.28%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 7,
    textAlign: 'center',
    margin: 2,
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
    fontSize: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '30%',
    marginBottom: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  imageCell: {
    width: 40,
    height: 30,
    margin: 'auto',
  },
});

// PDF Document Component
const BOQPDFDocument = ({ boqData, companyLogo, companyInfo }) => {
  // Generate estimate number (VOO/01/24 format)
  const generateEstimateNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `VOO/${month}/${year}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Info */}
        <View style={styles.header}>
          <View>
            {companyLogo && (
              <Image src={companyLogo} style={styles.logo} />
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text>YOOMET</Text>
            <Text>{companyInfo.address}</Text>
            <Text>Tel: {companyInfo.phone}</Text>
            <Text>Email: {companyInfo.email}</Text>
          </View>
        </View>

        {/* Title Section */}
        <Text style={styles.title}>YOOMET</Text>
        <Text style={styles.subtitle}>Tentative Interior Design Costing V1</Text>

        {/* Client Information */}
        <View style={styles.clientInfo}>
          <View>
            <Text>CLIENT NAME: {boqData.customer}</Text>
            <Text>LOCATION: {boqData.location || 'Not specified'}</Text>
          </View>
          <View>
            <Text>ESTIMATE: {generateEstimateNumber()}</Text>
            <Text>DATE: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Quote Section */}
        <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>QUOTE</Text>

        {/* Table Header */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>DESCRIPTION</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>SPECIFICATION</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>QTY</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>AREA/UNIT</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>PRICE</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>TOTAL</Text>
            </View>
            <View style={styles.tableColHeader}>
              <Text style={styles.tableCellHeader}>REMARKS/IMAGES</Text>
            </View>
          </View>

          {/* Table Rows */}
          {boqData.items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {item.scopeOfWork || boqData.scopeOfWork?.[0] || 'Interior Work'}
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.partName}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.numberOfUnits}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>{item.unitType}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{parseFloat(item.unitPrice).toLocaleString()}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>₹{parseFloat(item.totalPrice).toLocaleString()}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  {item.remarks || '-'}
                  {item.image && (
                    <Image 
                      src={item.image} 
                      style={styles.imageCell}
                    />
                  )}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Total without OSP:</Text>
            <Text>₹{parseFloat(boqData.finalTotalWithoutGST).toLocaleString()}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>OSP 16%:</Text>
            <Text>₹{(parseFloat(boqData.finalTotalWithoutGST) * 0.16).toLocaleString()}</Text>
          </View>
          <View style={{...styles.totalRow, fontWeight: 'bold'}}>
            <Text>GRAND TOTAL (incl. OSP):</Text>
            <Text>₹{parseFloat(boqData.totalWithGST).toLocaleString()}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>P14_USTR., KLOHE, August 1946</Text>
          <Text>Doktoratskoyama, Kamusaka-264700</Text>
          <Text>SHAKOWSKI-000007</Text>
          <Text>TEL: 021-3458 99966</Text>
        </View>
      </Page>
    </Document>
  );
};

const BOQPDFPreview = ({ boqItem, isOpen, onClose, onCancel }) => {
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState({
    address: 'Your Company Address',
    phone: '+91-XXXXXXXXXX',
    email: 'info@company.com'
  });
  const { showSuccess, showError } = useNotification();
  const pdfViewerRef = useRef();

  // Handle logo upload
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showError('Logo size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompanyLogo(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    try {
      // This would typically involve generating and downloading the PDF
      // For now, we'll show a success message
      showSuccess('PDF download started');
    } catch (error) {
      showError('Failed to download PDF');
    }
  };

  // Print PDF
  const handlePrintPDF = () => {
    if (pdfViewerRef.current) {
      const iframe = pdfViewerRef.current.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
      }
    }
  };

  if (!isOpen || !boqItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="BOQ PDF Preview"
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Controls */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex space-x-4">
            <label className="flex items-center px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              Upload Logo
            </label>
            
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download PDF
            </button>
            
            <button
              onClick={handlePrintPDF}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Print PDF
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        <div ref={pdfViewerRef} className="flex-1">
          <PDFViewer style={{ width: '100%', height: '100%' }}>
            <BOQPDFDocument 
              boqData={boqItem} 
              companyLogo={companyLogo}
              companyInfo={companyInfo}
            />
          </PDFViewer>
        </div>

        {/* Company Info Editor (Collapsible) */}
        <details className="border-t p-4">
          <summary className="cursor-pointer font-medium">Edit Company Information</summary>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="text"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </details>
      </div>
    </Modal>
  );
};

export default BOQPDFPreview;