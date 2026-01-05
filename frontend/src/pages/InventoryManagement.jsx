import React, { useState, useEffect } from 'react';
import { inventoryAPI, vendorsAPI, receiptsAPI, dispatchesAPI } from '../services/api';
import InventorySummaryTable from '../components/Inventory/InventorySummaryTable';
import InventoryPDFGenerator from '../components/Inventory/InventoryPDFGenerator';
import { Factory, Users, RotateCcw, Package, FileDown } from 'lucide-react';

const StockMaster = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Flattened data states
  const [allReceipts, setAllReceipts] = useState([]);
  const [allDispatches, setAllDispatches] = useState([]);
  const [masterRowData, setMasterRowData] = useState([]);

  // PDF generation states
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch data from all sources
        const [inventoryRes, vendorsRes, receiptsRes, dispatchesRes] = await Promise.all([
          inventoryAPI.getAll(),
          vendorsAPI.getAll(),
          receiptsAPI.getAll(),
          dispatchesAPI.getAll()
        ]);

        const items = inventoryRes.data || [];
        setInventoryItems(items);
        setVendors(vendorsRes.data || []);

        // Get receipts and dispatches from their dedicated APIs
        const receiptsData = receiptsRes.data?.data || receiptsRes.data || [];
        const dispatchesData = dispatchesRes.data?.data || dispatchesRes.data || [];

        console.log('Fetched inventory items:', items.length);
        console.log('Fetched receipts:', receiptsData.length);
        console.log('Fetched dispatches:', dispatchesData.length);

        setAllReceipts(receiptsData);
        setAllDispatches(dispatchesData);

        // Create a Map to store all unique combinations
        // ONLY show combinations that have actual receipt or dispatch data
        const combinationsMap = new Map();

        // PRIORITY 1: Add combinations from receipts
        receiptsData.forEach(r => {
          if (r.workCategory && r.partName) {
            const key = `${r.workCategory}_${r.partName}`;
            if (!combinationsMap.has(key)) {
              // Check if there's an inventory item for this combination
              const inventoryItem = items.find(item =>
                item.workCategory === r.workCategory && item.partName === r.partName
              );

              combinationsMap.set(key, {
                workCategory: r.workCategory,
                partName: r.partName,
                inventoryId: inventoryItem?._id,
                category: inventoryItem?.rowData?.[0]?.category || 'In house',
                vendorNames: inventoryItem?.rowData?.[0]?.vendorNames || [],
                reOrderLevel: inventoryItem?.reOrderLevel || 0
              });
            }
          }
        });

        // PRIORITY 2: Add combinations from dispatches (if not already added from receipts)
        dispatchesData.forEach(d => {
          if (d.workCategory && d.partName) {
            const key = `${d.workCategory}_${d.partName}`;
            if (!combinationsMap.has(key)) {
              // Check if there's an inventory item for this combination
              const inventoryItem = items.find(item =>
                item.workCategory === d.workCategory && item.partName === d.partName
              );

              combinationsMap.set(key, {
                workCategory: d.workCategory,
                partName: d.partName,
                inventoryId: inventoryItem?._id,
                category: inventoryItem?.rowData?.[0]?.category || 'In house',
                vendorNames: inventoryItem?.rowData?.[0]?.vendorNames || [],
                reOrderLevel: inventoryItem?.reOrderLevel || 0
              });
            }
          }
        });

        console.log('Total unique combinations found:', combinationsMap.size);
        console.log('Combinations details:', Array.from(combinationsMap.entries()));

        // Create Master Row Data from the combinations
        const derivedRows = Array.from(combinationsMap.values()).map((combo, index) => ({
          id: index + 1,
          workCategory: combo.workCategory,
          partName: combo.partName,
          category: combo.category,
          vendorNames: combo.vendorNames,
          reOrderLevel: combo.reOrderLevel,
          inventoryId: combo.inventoryId
        }));

        console.log('Master row data created:', derivedRows.length);
        console.log('Derived rows sample:', derivedRows.slice(0, 3));

        // Set the master row data
        setMasterRowData(derivedRows);

      } catch (err) {
        console.error('Error fetching stock master data:', err);
        setError('Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRowCategoryChange = (rowId, newCategory) => {
    setMasterRowData(prev => prev.map(row =>
      row.id === rowId ? { ...row, category: newCategory } : row
    ));
  };

  const handleRowVendorChange = (rowId, vendorName) => {
    setMasterRowData(prev => prev.map(row => {
      if (row.id === rowId) {
        const currentVendors = row.vendorNames || [];
        const isSelected = currentVendors.includes(vendorName);

        return {
          ...row,
          vendorNames: isSelected
            ? currentVendors.filter(v => v !== vendorName)
            : [...currentVendors, vendorName]
        };
      }
      return row;
    }));
  };

  const handleSave = async (row) => {
    try {
      // Find existing inventory item for this combination
      const existingItem = inventoryItems.find(item =>
        item.workCategory === row.workCategory && item.partName === row.partName
      );

      const rowDataToSave = {
        workCategory: row.workCategory,
        partName: row.partName,
        category: row.category,
        vendorNames: row.vendorNames || []
      };

      if (existingItem) {
        // Update existing item
        const updatedRowData = existingItem.rowData?.map(r =>
          r.workCategory === row.workCategory && r.partName === row.partName
            ? rowDataToSave
            : r
        ) || [];

        // If the row doesn't exist in rowData, add it
        const rowExists = existingItem.rowData?.some(r =>
          r.workCategory === row.workCategory && r.partName === row.partName
        );

        await inventoryAPI.update(existingItem._id, {
          ...existingItem,
          customerVendorName: row.vendorNames?.[0] || 'N/A',
          workCategory: row.workCategory,
          partName: row.partName,
          rowData: rowExists ? updatedRowData : [...(existingItem.rowData || []), rowDataToSave]
        });
      } else {
        // Create new inventory item
        await inventoryAPI.create({
          customerVendorName: row.vendorNames?.[0] || 'N/A',
          workCategory: row.workCategory,
          partName: row.partName,
          rowData: [rowDataToSave],
          receipts: [],
          dispatches: []
        });
      }

      showNotification('Saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving row:', err);
      showNotification('Failed to save. Please try again.', 'error');
    }
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const calculateStockForCombination = (workCategory, partName) => {
    // Filter receipts for this combination
    const matchingReceipts = allReceipts.filter(r =>
      r.workCategory === workCategory && r.partName === partName
    );

    // Filter dispatches for this combination
    const matchingDispatches = allDispatches.filter(d =>
      d.workCategory === workCategory && d.partName === partName
    );

    // Separate regular receipts (buy) from returns
    const regularReceipts = matchingReceipts.filter(r => r.receiptCategory !== 'return');
    const receiptReturns = matchingReceipts.filter(r => r.receiptCategory === 'return');

    // Separate dispatches by category
    const regularDispatches = matchingDispatches.filter(d => d.dispatchCategory === 'dispatch');
    const dispatchReturns = matchingDispatches.filter(d => d.dispatchCategory === 'return');
    const dispatchRejects = matchingDispatches.filter(d => d.dispatchCategory === 'reject');

    // Calculate totals for regular receipts only (excluding returns)
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);

    // Calculate regular dispatch totals (excluding returns and rejects)
    const regularDispatchesTotal = regularDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);

    // Calculate reject totals
    const rejectsTotal = dispatchRejects.reduce((sum, d) => sum + (d.totalValue || 0), 0);

    // Calculate return totals from both receipts and dispatches
    const receiptReturnsTotal = receiptReturns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (d.totalValue || 0), 0);

    const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;

    return {
      stockValueAtFactory: regularReceiptsTotal,
      stockValueSentToCustomer: regularDispatchesTotal,
      stockValueReturnFromCustomer: totalReturnsValue,
      totalStockValue: (regularReceiptsTotal - regularDispatchesTotal - rejectsTotal - receiptReturnsTotal) + dispatchReturnsTotal
    };
  };

  const calculateSummary = () => {
    let totalFactoryValue = 0;
    let totalCustomerValue = 0;
    let totalReturnValue = 0;
    let totalInventoryValue = 0;

    masterRowData.forEach(row => {
      const stock = calculateStockForCombination(row.workCategory, row.partName);
      totalFactoryValue += stock.stockValueAtFactory || 0;
      totalCustomerValue += stock.stockValueSentToCustomer || 0;
      totalReturnValue += stock.stockValueReturnFromCustomer || 0;
      totalInventoryValue += stock.totalStockValue || 0;
    });

    return { totalFactoryValue, totalCustomerValue, totalReturnValue, totalInventoryValue };
  };

  const summary = calculateSummary();

  // Handle PDF generation
  const handleGeneratePDF = () => {
    setGeneratingPDF(true);
    setShowPDFGenerator(true);
  };

  const handlePDFComplete = (blob, fileName) => {
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Reset states
    setGeneratingPDF(false);
    setShowPDFGenerator(false);
    showNotification('PDF generated successfully!', 'success');
  };

  const handlePDFError = (error) => {
    console.error('PDF generation error:', error);
    setGeneratingPDF(false);
    setShowPDFGenerator(false);
    showNotification('Failed to generate PDF. Please try again.', 'error');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (

    <div className="p-6 bg-gray-50">

      <div className="w-full mx-auto space-y-6">
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}>
            {notification.message}
          </div>
        )}



        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center bg-gradient-to-br from-blue-50 to-white">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Factory className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory at Factory</p>
              <p className="text-xl font-bold text-gray-900">₹{summary.totalFactoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center bg-gradient-to-br from-purple-50 to-white">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory at Customer End</p>
              <p className="text-xl font-bold text-gray-900">₹{summary.totalCustomerValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center bg-gradient-to-br from-orange-50 to-white">
            <div className="p-3 rounded-full bg-orange-100 mr-4">
              <RotateCcw className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory Return</p>
              <p className="text-xl font-bold text-gray-900">₹{summary.totalReturnValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center bg-gradient-to-br from-green-50 to-white">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Inventory</p>
              <p className="text-xl font-bold text-gray-900">₹{summary.totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Main Content Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Master</h1>
              <p className="text-gray-500">Comprehensive view of all inventory stock summaries.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                Total Parts: {masterRowData.length}
              </span>
            </div>
          </div>
          {masterRowData.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg">
              <p>No stock data available.</p>
              <p className="text-sm mt-2">Add receipts or dispatches to see data here.</p>
            </div>
          ) : (
            <InventorySummaryTable
              rowData={masterRowData}
              vendors={vendors}
              reOrderLevel={0}
              receipts={allReceipts}
              dispatches={allDispatches}
              onRowCategoryChange={handleRowCategoryChange}
              onRowVendorChange={handleRowVendorChange}
              onSave={handleSave}
              readOnly={false}
            />
          )}
        </div>

        {/* PDF Generator - Hidden component for background generation */}
        {showPDFGenerator && (
          <InventoryPDFGenerator
            inventoryData={inventoryItems}
            onComplete={handlePDFComplete}
            onError={handlePDFError}
          />
        )}
      </div>
    </div>
  );
};

export default StockMaster;
