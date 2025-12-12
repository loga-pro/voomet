import React from 'react';

const InventorySummaryTable = ({
  rowData,
  vendors = [], 
  reOrderLevel,
  receipts = [],
  dispatches = [],
  onRowCategoryChange,
  onRowVendorChange,
  readOnly = false
}) => {
  // Helper function to calculate stock values for a specific work category and part name
  const calculateStockForCombination = (workCategory, partName) => {
    // Filter receipts for this combination
    const matchingReceipts = receipts.filter(r => 
      r.workCategory === workCategory && r.partName === partName
    );
    
    // Filter dispatches for this combination
    const matchingDispatches = dispatches.filter(d => 
      d.workCategory === workCategory && d.partName === partName
    );
    
    // Separate regular receipts (buy) from returns
    const regularReceipts = matchingReceipts.filter(r => r.receiptCategory !== 'return');
    const returns = matchingReceipts.filter(r => r.receiptCategory === 'return');
    
    // Calculate totals for regular receipts only (excluding returns)
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Calculate dispatch totals
    const dispatchesTotal = matchingDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchesQty = matchingDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate return totals (separate from factory stock)
    const returnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const returnsQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    return {
      // Stock at Factory: Only regular receipts minus dispatches (NO returns)
      stockAtFactory: Math.max(0, regularReceiptsQty - dispatchesQty),
      stockValueAtFactory: regularReceiptsTotal - dispatchesTotal,
      
      // Stock sent to customer
      stockSentToCustomer: dispatchesQty,
      stockValueSentToCustomer: dispatchesTotal,
      
      // Returns tracked separately
      stockReturnFromCustomer: returnsQty,
      stockValueReturnFromCustomer: returnsTotal,
      
      // Total stock: Factory stock + Returns (kept separate)
      totalStock: Math.max(0, regularReceiptsQty - dispatchesQty) + returnsQty,
      totalStockValue: (regularReceiptsTotal - dispatchesTotal) + returnsTotal
    };
  };

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              S.No
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Work Category
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Part Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Category
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Vendor Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Re-order level
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock at Factory
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock value at Factory
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock sent to Customer
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock value sent to Customer
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock return from Customer
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock value return from Customer
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Total Stock
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Total Stock value
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rowData.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">{row.id}</td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {row.workCategory || '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {row.partName || '-'}
              </td>
              {/* Editable Category Column */}
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {readOnly ? (
                  row.category
                ) : (
                  <select
                    value={row.category}
                    onChange={(e) => onRowCategoryChange(row.id, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="In house">In house</option>
                    <option value="Bought-out">Bought-out</option>
                  </select>
                )}
              </td>
              {/* Multi-select Vendor Name Column */}
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {readOnly ? (
                   <div className="flex flex-wrap gap-1">
                     {row.vendorNames?.map((vendorName, idx) => (
                       <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                         {vendorName}
                       </span>
                     ))}
                   </div>
                ) : (
                  <div className="relative">
                    <div className="min-h-[32px] border border-gray-300 rounded-md px-2 py-1 bg-white">
                      {row.vendorNames && row.vendorNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.vendorNames.map((vendorName, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {vendorName}
                              <button
                                type="button"
                                onClick={() => onRowVendorChange(row.id, vendorName)}
                                className="ml-1 inline-flex items-center p-0.5 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Select vendors...</span>
                      )}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                        {row.vendorNames && row.vendorNames.length > 0 ? 'Modify selection' : 'Select vendors'}
                      </summary>
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {vendors.length > 0 ? (
                          vendors.map((vendor) => (
                            <label
                              key={vendor._id}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={row.vendorNames?.includes(vendor.vendorName) || false}
                                onChange={() => onRowVendorChange(row.id, vendor.vendorName)}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-900">{vendor.vendorName}</span>
                            </label>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">No vendors available</div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {reOrderLevel || '0'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return stock.stockAtFactory || '0';
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return `₹${stock.stockValueAtFactory?.toFixed(2) || '0.00'}`;
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return stock.stockSentToCustomer || '0';
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return `₹${stock.stockValueSentToCustomer?.toFixed(2) || '0.00'}`;
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return stock.stockReturnFromCustomer || '0';
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return `₹${stock.stockValueReturnFromCustomer?.toFixed(2) || '0.00'}`;
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return stock.totalStock || '0';
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return `₹${stock.totalStockValue?.toFixed(2) || '0.00'}`;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InventorySummaryTable;
