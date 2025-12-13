import React from 'react';

const InventorySummaryTable = ({
  rowData,
  vendors = [], 
  reOrderLevel,
  receipts = [],
  dispatches = [],
  onRowCategoryChange,
  onRowVendorChange,
  onSave,
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
    const receiptReturns = matchingReceipts.filter(r => r.receiptCategory === 'return');
    
    // Separate dispatches by category
    const regularDispatches = matchingDispatches.filter(d => d.dispatchCategory === 'dispatch');
    const dispatchReturns = matchingDispatches.filter(d => d.dispatchCategory === 'return');
    const dispatchRejects = matchingDispatches.filter(d => d.dispatchCategory === 'reject');
    
    // Calculate totals for regular receipts only (excluding returns)
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Calculate regular dispatch totals (excluding returns and rejects)
    const regularDispatchesTotal = regularDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const regularDispatchesQty = regularDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate reject totals
    const rejectsTotal = dispatchRejects.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const rejectsQty = dispatchRejects.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate return totals from both receipts and dispatches
    const receiptReturnsTotal = receiptReturns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const receiptReturnsQty = receiptReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchReturnsQty = dispatchReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Total returns (from both receipts and dispatches)
    const totalReturnsQty = receiptReturnsQty + dispatchReturnsQty;
    const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;
    
    return {
      // Stock at Factory: Regular receipts minus regular dispatches minus rejects (NO returns)
      stockAtFactory: Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty),
      stockValueAtFactory: regularReceiptsTotal - regularDispatchesTotal - rejectsTotal,
      
      // Stock sent to customer (only regular dispatches, not returns or rejects)
      stockSentToCustomer: regularDispatchesQty,
      stockValueSentToCustomer: regularDispatchesTotal,
      
      // Rejected stock
      stockRejected: rejectsQty,
      stockValueRejected: rejectsTotal,
      
      // Returns from customer (from both receipt returns and dispatch returns)
      stockReturnFromCustomer: totalReturnsQty,
      stockValueReturnFromCustomer: totalReturnsValue,
      
      // Total stock: Factory stock + Returns (rejects are not counted in total)
      totalStock: Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty) + totalReturnsQty,
      totalStockValue: (regularReceiptsTotal - regularDispatchesTotal - rejectsTotal) + totalReturnsValue
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
              Stock Reject
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase border border-gray-300">
              Stock value Reject
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
                {row.category || '-'}
              </td>
              {/* Multi-select Vendor Name Column */}
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                 <div className="flex flex-wrap gap-1">
                   {row.vendorNames && row.vendorNames.length > 0 ? (
                     row.vendorNames.map((vendorName, idx) => (
                       <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                         {vendorName}
                       </span>
                     ))
                   ) : (
                     <span className="text-gray-500">-</span>
                   )}
                 </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {row.reOrderLevel || '0'}
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
                  return stock.stockRejected || '0';
                })()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 border border-gray-300">
                {(() => {
                  const stock = calculateStockForCombination(row.workCategory, row.partName);
                  return `₹${stock.stockValueRejected?.toFixed(2) || '0.00'}`;
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
