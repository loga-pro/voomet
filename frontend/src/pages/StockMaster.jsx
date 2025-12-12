import React, { useState, useEffect } from 'react';
import { inventoryAPI, vendorsAPI } from '../services/api';
import InventorySummaryTable from '../components/Inventory/InventorySummaryTable';

const StockMaster = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Flattened data states
  const [allReceipts, setAllReceipts] = useState([]);
  const [allDispatches, setAllDispatches] = useState([]);
  const [masterRowData, setMasterRowData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [inventoryRes, vendorsRes] = await Promise.all([
          inventoryAPI.getAll(),
          vendorsAPI.getAll()
        ]);
        
        const items = inventoryRes.data || [];
        setInventoryItems(items);
        setVendors(vendorsRes.data || []);
        
        // 1. Flatten all receipts and dispatches
        const receipts = items.flatMap(item => item.receipts || []);
        const dispatches = items.flatMap(item => item.dispatches || []);
        setAllReceipts(receipts);
        setAllDispatches(dispatches);
        
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
        receipts.forEach(r => {
          const key = `${r.workCategory || ''}_${r.partName || ''}`;
          if (!combinations.has(key) && (r.workCategory || r.partName)) {
            combinations.set(key, {
              workCategory: r.workCategory || '-',
              partName: r.partName || '-'
            });
          }
        });
        
        // From dispatches
        dispatches.forEach(d => {
          const key = `${d.workCategory || ''}_${d.partName || ''}`;
          if (!combinations.has(key) && (d.workCategory || d.partName)) {
            combinations.set(key, {
              workCategory: d.workCategory || '-',
              partName: d.partName || '-'
            });
          }
        });
        
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Master</h1>
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
              <p className="text-sm mt-2">Add receipts or dispatches in Inventory Management to see data here.</p>
            </div>
          ) : (
            <InventorySummaryTable
              rowData={masterRowData}
              vendors={vendors}
              // reOrderLevel isn't global, it varies per item. 
              // We might need to handle this if we want to show it. 
              // For now, passing 0 or removing the column in future if needed.
              // Actually, we can try to find the reOrderLevel from the first matching inventory item too.
              reOrderLevel={0} 
              receipts={allReceipts}
              dispatches={allDispatches}
              onRowCategoryChange={() => {}} // Read-only
              onRowVendorChange={() => {}} // Read-only
              readOnly={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockMaster;
