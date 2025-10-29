const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const moment = require('moment');

// --- Ultra Premium Color Palette ---
const COLORS = {
  primary: [15, 23, 42],           // Slate 900
  primaryLight: [30, 41, 59],      // Slate 800
  accent: [99, 102, 241],          // Indigo 500
  accentLight: [129, 140, 248],    // Indigo 400
  success: [34, 197, 94],          // Green 500
  successBg: [220, 252, 231],      // Green 100
  warning: [249, 115, 22],         // Orange 500
  warningBg: [254, 243, 199],      // Amber 100
  danger: [239, 68, 68],           // Red 500
  dangerBg: [254, 226, 226],       // Red 100
  info: [59, 130, 246],            // Blue 500
  infoBg: [219, 234, 254],         // Blue 100
  background: [248, 250, 252],     // Slate 50
  cardBg: [255, 255, 255],         // White
  textPrimary: [15, 23, 42],       // Slate 900
  textSecondary: [71, 85, 105],    // Slate 600
  textLight: [148, 163, 184],      // Slate 400
  border: [226, 232, 240],         // Slate 200
  borderDark: [203, 213, 225],     // Slate 300
};

class PDFReportGenerator {

  /**
   * Draw modern arrow up icon (SVG style)
   */
  _drawArrowUp(doc, x, y, size = 10) {
    doc.setFillColor(...COLORS.success);
    
    // Arrow shaft
    const shaftWidth = size * 0.3;
    doc.roundedRect(x - shaftWidth/2, y + size * 0.3, shaftWidth, size * 0.7, 1, 1, 'F');
    
    // Arrow head (triangle)
    doc.triangle(
      x, y,                           // Top point
      x - size/2, y + size * 0.4,    // Bottom left
      x + size/2, y + size * 0.4,    // Bottom right
      'F'
    );
  }

  /**
   * Draw modern arrow down icon (SVG style)
   */
  _drawArrowDown(doc, x, y, size = 10) {
    doc.setFillColor(...COLORS.warning);
    
    // Arrow shaft
    const shaftWidth = size * 0.3;
    doc.roundedRect(x - shaftWidth/2, y, shaftWidth, size * 0.7, 1, 1, 'F');
    
    // Arrow head (triangle pointing down)
    doc.triangle(
      x, y + size,                    // Bottom point
      x - size/2, y + size * 0.6,    // Top left
      x + size/2, y + size * 0.6,    // Top right
      'F'
    );
  }

  /**
   * Draw modern refresh/circular icon (SVG style)
   */
  _drawRefreshIcon(doc, x, y, size = 10) {
    doc.setFillColor(...COLORS.danger);
    doc.setDrawColor(...COLORS.danger);
    doc.setLineWidth(1.8);
    
    // Draw circular arrow using arc segments
    const radius = size / 2.2;
    const segments = 24;
    const angleStart = Math.PI * 0.3;
    const angleEnd = Math.PI * 2.3;
    
    // Main arc
    for (let i = 0; i < segments; i++) {
      const angle1 = angleStart + (angleEnd - angleStart) * (i / segments);
      const angle2 = angleStart + (angleEnd - angleStart) * ((i + 1) / segments);
      doc.line(
        x + Math.cos(angle1) * radius,
        y + Math.sin(angle1) * radius,
        x + Math.cos(angle2) * radius,
        y + Math.sin(angle2) * radius
      );
    }
    
    // Arrow head at the end
    const arrowSize = 3;
    const endAngle = angleEnd;
    const arrowX = x + Math.cos(endAngle) * radius;
    const arrowY = y + Math.sin(endAngle) * radius;
    
    doc.triangle(
      arrowX, arrowY,
      arrowX - arrowSize * 0.8, arrowY + arrowSize * 0.5,
      arrowX - arrowSize * 0.3, arrowY - arrowSize * 0.8,
      'F'
    );
  }

  /**
   * Draw modern bar chart icon (SVG style)
   */
  _drawBarChartIcon(doc, x, y, size = 10) {
    doc.setFillColor(...COLORS.info);
    
    const barWidth = size * 0.22;
    const spacing = size * 0.12;
    
    // Three bars with different heights
    doc.roundedRect(x - size/2, y + size * 0.4, barWidth, size * 0.6, 1, 1, 'F');
    doc.roundedRect(x - barWidth/2, y, barWidth, size, 1, 1, 'F');
    doc.roundedRect(x + spacing + barWidth/2, y + size * 0.25, barWidth, size * 0.75, 1, 1, 'F');
  }

  /**
   * Add ultra-premium header with modern design
   */
  _addUltraPremiumHeader(doc, title, subtitle) {
    const pageWidth = doc.internal.pageSize.width;
    
    // Dark background for header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Top accent line - thicker and more prominent
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 3, 'F');
    
    // Diagonal decorative elements
    doc.setFillColor(...COLORS.accentLight);
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.triangle(pageWidth - 80, 0, pageWidth, 0, pageWidth, 50, 'F');
    doc.triangle(pageWidth - 40, 0, pageWidth, 0, pageWidth, 50, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    // Company branding - left side
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VOOMET', 20, 18);
    
    // Separator circle
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.3 }));
    doc.circle(42, 16, 1.2, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.setFont(undefined, 'normal');
    doc.text('Inventory Management System', 47, 18);
    
    // Main title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 20, 34);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(subtitle, 20, 43);
    
    // Timestamp - right aligned
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const timestamp = moment().format('DD/MM/YYYY HH:mm');
    doc.text(`Generated: ${timestamp}`, pageWidth - 20, 43, { align: 'right' });
  }

  /**
   * Add modern metric card with colored left bar and icon
   */
  _addModernMetricCard(doc, x, y, width, height, title, value, iconType, colors) {
    // Card shadow
    doc.setFillColor(15, 23, 42);
    doc.setGState(doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    
    // Subtle border
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 4, 4, 'S');
    
    // Left colored accent bar
    doc.setFillColor(...colors.main);
    doc.roundedRect(x, y, 3, height, 4, 4, 'F');
    
    // Icon background - subtle circle
    const iconX = x + width/2;
    const iconY = y + 14;
    doc.setFillColor(...colors.bg);
    doc.circle(iconX, iconY, 9, 'F');
    
    // Draw icon
    if (iconType === 'up') {
      this._drawArrowUp(doc, iconX, iconY - 5, 10);
    } else if (iconType === 'down') {
      this._drawArrowDown(doc, iconX, iconY - 5, 10);
    } else if (iconType === 'refresh') {
      this._drawRefreshIcon(doc, iconX, iconY, 10);
    } else if (iconType === 'chart') {
      this._drawBarChartIcon(doc, iconX, iconY, 10);
    }
    
    // Title
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont(undefined, 'normal');
    doc.text(title, x + width/2, y + height - 14, { align: 'center' });
    
    // Value - large and prominent
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colors.main);
    doc.text(value.toString(), x + width/2, y + height - 4, { align: 'center' });
  }

  /**
   * Add modern bar chart visualization
   */
  _addModernBarChart(doc, x, y, width, height, data, title) {
    // Card with shadow
    doc.setFillColor(15, 23, 42);
    doc.setGState(doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    
    // Border
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 4, 4, 'S');
    
    // Title
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont(undefined, 'bold');
    doc.text(title, x + 10, y + 12);
    
    // Chart area
    const chartPadding = 15;
    const chartX = x + chartPadding;
    const chartY = y + 24;
    const chartWidth = width - chartPadding * 2;
    const chartHeight = height - 34;
    
    // Find max value for scaling
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    // Calculate bar dimensions
    const barCount = data.length;
    const totalSpacing = chartWidth * 0.2;
    const barSpacing = totalSpacing / (barCount + 1);
    const barWidth = (chartWidth - totalSpacing) / barCount;
    
    // Draw bars
    data.forEach((item, index) => {
      const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
      const barX = chartX + barSpacing + index * (barWidth + barSpacing);
      const barY = chartY + chartHeight - barHeight;
      
      // Bar shadow
      doc.setFillColor(0, 0, 0);
      doc.setGState(doc.GState({ opacity: 0.05 }));
      doc.roundedRect(barX + 0.5, barY + 0.5, barWidth, barHeight, 2, 2, 'F');
      doc.setGState(doc.GState({ opacity: 1 }));
      
      // Bar
      doc.setFillColor(...item.color);
      doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
      
      // Value on top or inside
      if (barHeight > 8) {
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(item.value.toString(), barX + barWidth/2, barY + barHeight/2 + 2, { align: 'center' });
      } else if (item.value > 0) {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFont(undefined, 'bold');
        doc.text(item.value.toString(), barX + barWidth/2, barY - 3, { align: 'center' });
      }
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, 'normal');
      doc.text(item.label, barX + barWidth/2, chartY + chartHeight + 8, { align: 'center' });
    });
  }

  /**
   * Add modern info panel
   */
  _addModernInfoPanel(doc, x, y, width, height, label, value, sublabel = '') {
    // Card with shadow
    doc.setFillColor(15, 23, 42);
    doc.setGState(doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    // Card background with subtle gradient effect
    doc.setFillColor(...COLORS.infoBg);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    
    // Border with accent color
    doc.setDrawColor(...COLORS.info);
    doc.setLineWidth(1.5);
    doc.roundedRect(x, y, width, height, 4, 4, 'S');
    
    // Label
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont(undefined, 'normal');
    doc.text(label, x + 12, y + height/2 - 8);
    
    // Large value
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORS.info);
    doc.text(value.toString(), x + width/2, y + height/2 + 10, { align: 'center' });
    
    // Sublabel
    if (sublabel) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont(undefined, 'normal');
      doc.text(sublabel, x + 12, y + height - 8);
    }
  }

  /**
   * Add ultra-modern table with HORIZONTAL headers
   */
  _addUltraModernTable(doc, head, body, startY, title, options = {}) {
    // Section header
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont(undefined, 'bold');
    doc.text(title, 20, startY);
    
    // Accent underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(3);
    doc.line(20, startY + 2, 70, startY + 2);
    
    const tableStartY = startY + 10;
    
    doc.autoTable({
      head: [head],
      body: body,
      startY: tableStartY,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 7,
        overflow: 'linebreak',
        lineColor: COLORS.border,
        lineWidth: 0,
        halign: 'left'
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 9,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      rowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawCell: (data) => {
        // Add accent bottom border to header
        if (data.section === 'head') {
          doc.setDrawColor(...COLORS.accent);
          doc.setLineWidth(2);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }
      },
      ...options
    });
    
    return doc.autoTable.previous.finalY;
  }

  /**
   * Add ultra-premium footer
   */
  _addUltraPremiumFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      const footerY = pageHeight - 18;
      
      // Top accent line
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(2);
      doc.line(20, footerY - 7, pageWidth - 20, footerY - 7);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont(undefined, 'normal');
      doc.text('Automated Report by Voomet Inventory Management System', 20, footerY);
      
      // Page number with decorative elements
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORS.textSecondary);
      
      // Decorative dots
      doc.setFillColor(...COLORS.accent);
      doc.circle(pageWidth/2 - 12, footerY - 2, 1, 'F');
      doc.circle(pageWidth/2 + 12, footerY - 2, 1, 'F');
      
      doc.text(`${i} / ${pageCount}`, pageWidth/2, footerY, { align: 'center' });
    }
  }

  /**
   * Generate Daily Inventory Report
   */
  generateDailyInventoryReport(reportData) {
    const { date, totalReceipts, totalDispatches, totalReturns, items } = reportData;
    
    const doc = new jsPDF();
    
    doc.setProperties({
      title: `Daily Inventory Report - ${date}`,
      subject: 'Daily Inventory Analysis',
      author: 'Voomet Inventory System',
      creator: 'Voomet Ultra-Premium Report Generator'
    });

    // Header
    this._addUltraPremiumHeader(doc, 'Daily Inventory Report', `Report Date: ${date}`);
    
    let currentY = 62;
    
    // Metric Cards Row
    const cardWidth = 44;
    const cardHeight = 38;
    const cardSpacing = 4;
    const startX = 20;
    
    this._addModernMetricCard(
      doc, startX, currentY, cardWidth, cardHeight,
      'RECEIPTS', totalReceipts, 'up',
      { main: COLORS.success, bg: COLORS.successBg }
    );
    
    this._addModernMetricCard(
      doc, startX + cardWidth + cardSpacing, currentY, cardWidth, cardHeight,
      'DISPATCHES', totalDispatches, 'down',
      { main: COLORS.warning, bg: COLORS.warningBg }
    );
    
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 2, currentY, cardWidth, cardHeight,
      'RETURNS', totalReturns, 'refresh',
      { main: COLORS.danger, bg: COLORS.dangerBg }
    );
    
    const netChange = totalReceipts - totalDispatches + totalReturns;
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 3, currentY, cardWidth, cardHeight,
      'NET CHANGE', netChange, 'chart',
      { main: COLORS.info, bg: COLORS.infoBg }
    );
    
    currentY += cardHeight + 8;
    
    // Visual Analytics Section
    const chartData = [
      { label: 'Receipts', value: totalReceipts, color: COLORS.success },
      { label: 'Dispatches', value: totalDispatches, color: COLORS.warning },
      { label: 'Returns', value: totalReturns, color: COLORS.danger }
    ];
    
    this._addModernBarChart(doc, 20, currentY, 105, 58, chartData, 'Activity Overview');
    
    // Info Panel
    const itemCount = items ? items.length : 0;
    this._addModernInfoPanel(
      doc, 130, currentY, 60, 58,
      'Active Items Today',
      itemCount,
      `${itemCount} items had inventory movements`
    );
    
    currentY += 68;
    
    // Detailed Table with HORIZONTAL headers
    if (items && items.length > 0) {
      const tableData = items.map(item => [
        item.scopeOfWork || 'N/A',
        item.partName || 'N/A',
        item.dailyReceipts.toString(),
        item.dailyDispatches.toString(),
        item.dailyReturns.toString(),
        item.currentStock.toString(),
        `₹${(item.cumulativePriceValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      
      // HORIZONTAL headers - single line
      const head = ['Scope of Work', 'Part Name', 'Receipts', 'Dispatches', 'Returns', 'Stock', 'Value'];
      
      this._addUltraModernTable(doc, head, tableData, currentY, 'Detailed Inventory Movements', {
        columnStyles: {
          0: { cellWidth: 38, halign: 'left' },
          1: { cellWidth: 45, halign: 'left' },
          2: { cellWidth: 18, halign: 'center', textColor: COLORS.success, fontStyle: 'bold' },
          3: { cellWidth: 18, halign: 'center', textColor: COLORS.warning, fontStyle: 'bold' },
          4: { cellWidth: 18, halign: 'center', textColor: COLORS.danger, fontStyle: 'bold' },
          5: { cellWidth: 18, halign: 'center', textColor: COLORS.textPrimary, fontStyle: 'bold' },
          6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
        }
      });
    } else {
      // Empty state card
      const emptyY = currentY + 20;
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(50, emptyY, 110, 45, 4, 4, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(50, emptyY, 110, 45, 4, 4, 'S');
      
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, 'normal');
      doc.text('No inventory activity recorded', 105, emptyY + 20, { align: 'center' });
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      doc.text('for this date', 105, emptyY + 30, { align: 'center' });
    }
    
    // Footer
    this._addUltraPremiumFooter(doc);
    
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  /**
   * Generate Weekly Inventory Report
   */
  generateWeeklyInventoryReport(weeklyData) {
    const doc = new jsPDF();

    const totalReceipts = weeklyData.reduce((sum, day) => sum + day.receipts, 0);
    const totalDispatches = weeklyData.reduce((sum, day) => sum + day.dispatches, 0);
    const totalReturns = weeklyData.reduce((sum, day) => sum + day.returns, 0);
    const activeDays = weeklyData.length;

    const startDate = activeDays ? weeklyData[0].date : 'N/A';
    const endDate = activeDays ? weeklyData[activeDays - 1].date : 'N/A';
    
    doc.setProperties({
      title: `Weekly Inventory Report - ${startDate} to ${endDate}`,
      subject: 'Weekly Inventory Analysis',
      author: 'Voomet Inventory System',
      creator: 'Voomet Ultra-Premium Report Generator'
    });

    // Header
    this._addUltraPremiumHeader(doc, 'Weekly Inventory Report', `Period: ${startDate} to ${endDate}`);

    let currentY = 62;
    
    // Metric Cards
    const cardWidth = 44;
    const cardHeight = 38;
    const cardSpacing = 4;
    const startX = 20;
    
    this._addModernMetricCard(
      doc, startX, currentY, cardWidth, cardHeight,
      'TOTAL RECEIPTS', totalReceipts, 'up',
      { main: COLORS.success, bg: COLORS.successBg }
    );
    
    this._addModernMetricCard(
      doc, startX + cardWidth + cardSpacing, currentY, cardWidth, cardHeight,
      'TOTAL DISPATCHES', totalDispatches, 'down',
      { main: COLORS.warning, bg: COLORS.warningBg }
    );
    
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 2, currentY, cardWidth, cardHeight,
      'TOTAL RETURNS', totalReturns, 'refresh',
      { main: COLORS.danger, bg: COLORS.dangerBg }
    );
    
    const netChange = totalReceipts - totalDispatches + totalReturns;
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 3, currentY, cardWidth, cardHeight,
      'WEEKLY NET', netChange, 'chart',
      { main: COLORS.info, bg: COLORS.infoBg }
    );
    
    currentY += cardHeight + 8;
    
    // Weekly trend chart
    const trendData = weeklyData.slice(0, 7).map(day => ({
      label: day.date.split('/')[0] + '/' + day.date.split('/')[1],
      value: day.receipts - day.dispatches + day.returns,
      color: COLORS.info
    }));
    
    this._addModernBarChart(doc, 20, currentY, 170, 58, trendData, 'Daily Net Change Trend');
    
    currentY += 68;
    
    // Daily breakdown table with HORIZONTAL headers
    const tableData = weeklyData.map(day => {
      const netChange = day.receipts - day.dispatches + day.returns;
      return [
        day.date,
        day.receipts.toString(),
        day.dispatches.toString(),
        day.returns.toString(),
        netChange.toString()
      ];
    });
    
    // HORIZONTAL headers - single line
    const head = ['Date', 'Receipts', 'Dispatches', 'Returns', 'Net Change'];
    
    this._addUltraModernTable(doc, head, tableData, currentY, 'Daily Breakdown', {
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold', halign: 'left' },
        1: { cellWidth: 30, halign: 'center', textColor: COLORS.success, fontStyle: 'bold' },
        2: { cellWidth: 30, halign: 'center', textColor: COLORS.warning, fontStyle: 'bold' },
        3: { cellWidth: 30, halign: 'center', textColor: COLORS.danger, fontStyle: 'bold' },
        4: { cellWidth: 30, halign: 'center', textColor: COLORS.info, fontStyle: 'bold' }
      }
    });
    
    // Footer
    this._addUltraPremiumFooter(doc);
    
    return Buffer.from(doc.output('arraybuffer'));
  }
}

module.exports = new PDFReportGenerator();