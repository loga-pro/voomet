const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const moment = require('moment');

class PDFReportGenerator {
  
  generateDailyInventoryReport(reportData) {
    const { date, totalReceipts, totalDispatches, totalReturns, items } = reportData;
    
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: `Daily Inventory Report - ${date}`,
      subject: 'Inventory Management Report',
      author: 'Voomet Inventory System',
      creator: 'Voomet Inventory System'
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('VOOMET INVENTORY MANAGEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Daily Inventory Report', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(127, 140, 141);
    doc.text(`Date: ${date}`, 105, 40, { align: 'center' });
    
    // Report Generated Info
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text(`Report Generated: ${moment().format('DD/MM/YYYY HH:mm:ss')}`, 105, 48, { align: 'center' });
    
    // Summary Statistics Boxes
    let startY = 60;
    
    // Receipts Box
    doc.setFillColor(232, 245, 233);
    doc.rect(15, startY, 55, 30, 'F');
    doc.setDrawColor(46, 125, 50);
    doc.rect(15, startY, 55, 30, 'S');
    doc.setFontSize(12);
    doc.setTextColor(46, 125, 50);
    doc.text('📥 RECEIPTS', 42.5, startY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(27, 94, 32);
    doc.text(totalReceipts.toString(), 42.5, startY + 20, { align: 'center' });
    
    // Dispatches Box
    doc.setFillColor(255, 243, 205);
    doc.rect(75, startY, 55, 30, 'F');
    doc.setDrawColor(133, 100, 4);
    doc.rect(75, startY, 55, 30, 'S');
    doc.setFontSize(12);
    doc.setTextColor(133, 100, 4);
    doc.text('📤 DISPATCHES', 102.5, startY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(245, 124, 0);
    doc.text(totalDispatches.toString(), 102.5, startY + 20, { align: 'center' });
    
    // Returns Box
    doc.setFillColor(248, 215, 218);
    doc.rect(135, startY, 55, 30, 'F');
    doc.setDrawColor(157, 30, 36);
    doc.rect(135, startY, 55, 30, 'S');
    doc.setFontSize(12);
    doc.setTextColor(157, 30, 36);
    doc.text('🔄 RETURNS', 162.5, startY + 8, { align: 'center' });
    doc.setFontSize(18);
    doc.setTextColor(198, 40, 40);
    doc.text(totalReturns.toString(), 162.5, startY + 20, { align: 'center' });
    
    // Net Change Box
    const netChange = totalReceipts - totalDispatches + totalReturns;
    doc.setFillColor(209, 236, 241);
    doc.rect(15, startY + 35, 175, 20, 'F');
    doc.setDrawColor(12, 84, 96);
    doc.rect(15, startY + 35, 175, 20, 'S');
    doc.setFontSize(12);
    doc.setTextColor(12, 84, 96);
    doc.text('NET CHANGE', 25, startY + 47);
    doc.setFontSize(16);
    doc.setTextColor(8, 76, 97);
    doc.text(netChange.toString(), 160, startY + 47, { align: 'right' });
    
    // Detailed Items Table
    if (items && items.length > 0) {
      startY = startY + 65;
      
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('Detailed Items Report', 15, startY);
      
      const tableData = items.map(item => [
        item.scopeOfWork || 'N/A',
        item.partName || 'N/A',
        item.dailyReceipts.toString(),
        item.dailyDispatches.toString(),
        item.dailyReturns.toString(),
        item.currentStock.toString()
      ]);
      
      doc.autoTable({
        head: [['Scope of Work', 'Part Name', 'Receipts', 'Dispatches', 'Returns', 'Current Stock']],
        body: tableData,
        startY: startY + 5,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          2: { cellWidth: 20, halign: 'center' }, // Receipts
          3: { cellWidth: 20, halign: 'center' }, // Dispatches
          4: { cellWidth: 20, halign: 'center' }, // Returns
          5: { cellWidth: 20, halign: 'center' }  // Current Stock
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        }
      });
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text('This report is generated automatically by Voomet Inventory Management System', 105, pageHeight - 20, { align: 'center' });
    
    return doc.output('arraybuffer');
  }
  
  generateWeeklyInventoryReport(weeklyData) {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('VOOMET INVENTORY MANAGEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text('Weekly Inventory Report', 105, 30, { align: 'center' });
    
    // Add weekly summary table
    const tableData = weeklyData.map(day => [
      day.date,
      day.receipts.toString(),
      day.dispatches.toString(),
      day.returns.toString(),
      (day.receipts - day.dispatches + day.returns).toString()
    ]);
    
    doc.autoTable({
      head: [['Date', 'Receipts', 'Dispatches', 'Returns', 'Net Change']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold'
      }
    });
    
    return doc.output('arraybuffer');
  }
}

module.exports = new PDFReportGenerator();