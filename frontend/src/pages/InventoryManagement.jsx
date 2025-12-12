import React, { useState, useEffect } from 'react';
import { inventoryAPI, vendorsAPI, receiptsAPI, dispatchesAPI } from '../services/api';
import InventorySummaryTable from '../components/Inventory/InventorySummaryTable';

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
        
        console.log('Fetched receipts:', receiptsData.length);
        console.log('Fetched dispatches:', dispatchesData.length);
        
        setAllReceipts(receiptsData);
        setAllDispatches(dispatchesData);
        
        // 2. Collect saved row preferences (Category, Vendor Names) from all items
        const savedPreferences = [];
        items.forEach(item => {
          if (Array.isArray(item.rowData)) {
            item.rowData.forEach(row => {
              if (row.workCategory || row.partName) {
                savedPreferences.push({
                  workCategory: row.workCategory,
                  partName: row.partName,
                  category: row.category,
                  vendorNames: row.vendorNames
                });
              }
            });
          }
        });
        
        // 3. Derive unique combinations (Work Category + Part Name)
        const combinations = new Map();
        
        // From receipts
        receiptsData.forEach(r => {
          const key = `${r.workCategory || ''}_${r.partName || ''}`;
          if (!combinations.has(key) && (r.workCategory || r.partName)) {
            combinations.set(key, {
              workCategory: r.workCategory || '-',
              partName: r.partName || '-'
            });
          }
        });
        
        // From dispatches
        dispatchesData.forEach(d => {
          const key = `${d.workCategory || ''}_${d.partName || ''}`;
          if (!combinations.has(key) && (d.workCategory || d.partName)) {
            combinations.set(key, {
              workCategory: d.workCategory || '-',
              partName: d.partName || '-'
            });
          }
        });
        
        console.log('Unique combinations found:', combinations.size);
        
        // 4. Create Master Row Data
        const derivedRows = Array.from(combinations.values()).map((combo, index) => {
          // Find if we have any saved preference for this combo
          // We prioritize preferences that have actual values
          const pref = savedPreferences.find(p => 
            p.workCategory === combo.workCategory && p.partName === combo.partName
          );
          
          return {
            id: index + 1,
            workCategory: combo.workCategory,
            partName: combo.partName,
            category: pref?.category || 'In house',
            vendorNames: pref?.vendorNames || []
          };
        });
        
        console.log('Master row data created:', derivedRows.length);
        
        // If no data at all, start with empty
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto space-y-8">
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Inventory Master</h1>
              <p className="text-gray-500">Comprehensive view of all inventory stock summaries.</p>
            </div>
            <div className="text-right">
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
      </div>
    </div>
  );
};

export default StockMaster;
