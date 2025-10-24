import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const ReportGenerator = ({ data, title, columns, filename }) => {
  const exportToCSV = () => {
    if (!data || !data.length) return;
    
    try {
      // Extract headers from columns
      const headers = columns.map(col => col.header);
      
      // Map data to CSV rows
      const csvData = data.map(item => 
        columns.map(col => {
          const value = typeof col.accessor === 'function' 
            ? col.accessor(item) 
            : item[col.accessor];
          // Wrap values in quotes to handle commas and special characters
          return `"${value || ''}"`;
        }).join(',')
      );
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...csvData
      ].join('\n');
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          onClick={exportToCSV}
          disabled={!data || !data.length}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>
      
      {data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                  {columns.map((column, colIndex) => {
                    const value = typeof column.accessor === 'function' 
                      ? column.accessor(item) 
                      : item[column.accessor];
                    return (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {value || '-'}  
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No data available for this report</p>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;