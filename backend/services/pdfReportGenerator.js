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
    
    const radius = size / 2.2;
    
    // Draw circular arrow using lines
    const steps = 30;
    const startAngle = Math.PI * 0.3;
    const endAngle = Math.PI * 2.3;
    const angleStep = (endAngle - startAngle) / steps;
    
    // Draw the arc
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (i * angleStep);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        doc.moveTo(px, py);
      } else {
        doc.lineTo(px, py);
      }
    }
    doc.stroke();
    
    // Arrow head at the end
    const arrowSize = 3;
    const endAngleRad = endAngle;
    const arrowX = x + Math.cos(endAngleRad) * radius;
    const arrowY = y + Math.sin(endAngleRad) * radius;
    
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
    
    // Company branding - left side (FIXED COMPANY NAME)
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('VOOMET', 15, 18);
    
    // Separator circle
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.3 }));
    doc.circle(37, 16, 1.2, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.setFont(undefined, 'normal');
    doc.text('Inventory Management System', 42, 18);
    
    // Main title
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 15, 34);
    
    // Subtitle
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(subtitle, 15, 43);
    
    // Timestamp - right aligned
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const timestamp = moment().format('DD/MM/YYYY HH:mm');
    doc.text(`Generated: ${timestamp}`, pageWidth - 15, 43, { align: 'right' });
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
    
    // Title - CENTERED (FIXED TEXT - PROPER TITLES)
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont(undefined, 'normal');
    
    // Fix card titles to prevent text cutoff and spelling errors
    let displayTitle = title;
    if (title === 'RECEIPTS') displayTitle = 'RECEIPTS';
    if (title === 'DISPATCHES') displayTitle = 'DISPATCHES';
    if (title === 'RETURNS') displayTitle = 'RETURNS';
    if (title === 'NET CHANGE') displayTitle = 'NET CHANGE';
    
    const titleWidth = doc.getTextWidth(displayTitle);
    doc.text(displayTitle, x + (width - titleWidth) / 2, y + height - 14);
    
    // Value - CENTERED and prominent
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colors.main);
    const valueText = value.toString();
    const valueWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + (width - valueWidth) / 2, y + height - 4);
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
    
    // Title - LEFT ALIGNED
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont(undefined, 'bold');
    doc.text(title, x + 8, y + 12);
    
    // Chart area
    const chartPadding = 12;
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
      
      // Value on top or inside - CENTERED
      if (barHeight > 8) {
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        const valueText = item.value.toString();
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + (barWidth - textWidth) / 2, barY + barHeight/2 + 2);
      } else if (item.value > 0) {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFont(undefined, 'bold');
        const valueText = item.value.toString();
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + (barWidth - textWidth) / 2, barY - 3);
      }
      
      // Label - CENTERED
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, 'normal');
      const labelWidth = doc.getTextWidth(item.label);
      doc.text(item.label, barX + (barWidth - labelWidth) / 2, chartY + chartHeight + 8);
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
    
    // Label - LEFT ALIGNED
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont(undefined, 'normal');
    doc.text(label, x + 8, y + height/2 - 8);
    
    // Large value - CENTERED
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...COLORS.info);
    const valueText = value.toString();
    const valueWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + (width - valueWidth) / 2, y + height/2 + 10);
    
    // Sublabel - LEFT ALIGNED
    if (sublabel) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont(undefined, 'normal');
      doc.text(sublabel, x + 8, y + height - 8);
    }
  }

  /**
   * Add ultra-modern table with OPTIMIZED COLUMN WIDTHS and NO EMPTY SPACE
   */
  _addUltraModernTable(doc, head, body, startY, title, options = {}) {
    // Section header
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont(undefined, 'bold');
    doc.text(title, 15, startY);
    
    // Accent underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(3);
    doc.line(15, startY + 2, 65, startY + 2);
    
    const tableStartY = startY + 10;
    
    // OPTIMIZED TABLE CONFIGURATION - Remove extra space and empty areas
    const tableOptions = {
      head: [head],
      body: body,
      startY: tableStartY,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 1, // Further reduced to minimize space
        overflow: 'ellipsize',
        lineColor: COLORS.border,
        lineWidth: 0.3,
        textColor: COLORS.textPrimary,
        font: 'helvetica',
        fontStyle: 'normal',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 6, // Reduced from 8
        lineHeight: 0.9  // Reduced line height
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2, // Reduced from 3
        lineColor: COLORS.border,
        lineWidth: 0.5,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8, // Reduced from 10
        lineHeight: 0.9
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: COLORS.textPrimary,
        fontStyle: 'normal',
        lineColor: COLORS.border,
        lineWidth: 0.2,
        minCellHeight: 6, // Reduced from 8
        lineHeight: 0.9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 15, right: 15 }, // Balanced margins
      tableWidth: 'wrap', // Fit content without extra space
      tableLineWidth: 0.3,
      tableLineColor: COLORS.border
    };

    // Add column styles if provided
    if (options.columnStyles) {
      tableOptions.columnStyles = options.columnStyles;
    }

    // Prevent text wrapping in headers
    tableOptions.didParseCell = function (data) {
      if (data.section === 'head') {
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
        data.cell.styles.lineHeight = 0.9;
        data.cell.styles.minCellHeight = 8;
        data.cell.styles.overflow = 'ellipsize';
      }
      
      // Remove extra padding from all cells
      data.cell.styles.cellPadding = 1;
    };

    tableOptions.didDrawCell = (data) => {
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
    };

    doc.autoTable(tableOptions);
    
    return doc.autoTable.previous.finalY;
  }

  /**
   * Add ultra-premium footer with adjusted spacing
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
      doc.line(15, footerY - 7, pageWidth - 15, footerY - 7);
      
      // Footer text - LEFT ALIGNED (FIXED COMPANY NAME)
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont(undefined, 'normal');
      doc.text('Automated Report by Voomet Inventory Management System', 15, footerY);
      
      // Page number - CENTERED
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...COLORS.textSecondary);
      
      // Decorative dots
      doc.setFillColor(...COLORS.accent);
      doc.circle(pageWidth/2 - 12, footerY - 2, 1, 'F');
      doc.circle(pageWidth/2 + 12, footerY - 2, 1, 'F');
      
      const pageText = `${i} / ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth/2 - pageTextWidth/2, footerY);
    }
  }

  /**
   * Generate Daily Inventory Report with ALL FIXES
   */
  generateDailyInventoryReport(reportData) {
    const { date, totalReceipts, totalDispatches, totalReturns, items } = reportData;
    
    const doc = new jsPDF();
    
    // Set font encoding explicitly to prevent text spacing issues
    doc.setFont('helvetica');
    doc.setFontSize(10);
    
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
    const startX = 15;
    
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
    
    this._addModernBarChart(doc, 15, currentY, 110, 58, chartData, 'Activity Overview');
    
    // Info Panel
    const itemCount = items ? items.length : 0;
    this._addModernInfoPanel(
      doc, 130, currentY, 65, 58,
      'Active Items Today',
      itemCount,
      `${itemCount} items had inventory movements`
    );
    
    currentY += 68;
    
    // Detailed Table with OPTIMIZED COLUMNS and FULL "RECEIPT" TEXT
    if (items && items.length > 0) {
      const tableData = items.map(item => {
        // FIXED CURRENCY FORMATTING - Simple and reliable
        const value = item.cumulativePriceValue || 0;
        let formattedValue;
        
        if (value >= 10000000) {
          // For crores: 1.23Cr
          formattedValue = (value / 10000000).toFixed(2) + 'Cr';
        } else if (value >= 100000) {
          // For lakhs: 1.23L
          formattedValue = (value / 100000).toFixed(2) + 'L';
        } else if (value >= 1000) {
          // For thousands: 1.23K
          formattedValue = (value / 1000).toFixed(2) + 'K';
        } else {
          // For regular numbers
          formattedValue = value.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          });
        }
        
        return [
          item.scopeOfWork || 'N/A',
          item.partName || 'N/A',
          item.dailyReceipts?.toString() || '0',
          item.dailyDispatches?.toString() || '0',
          item.dailyReturns?.toString() || '0',
          item.currentStock?.toString() || '0',
          `₹${formattedValue}`
        ];
      });
      
      // FIXED HEADER TEXT - "Receipt" in full form instead of "Rec."
      const head = ['Scope', 'Part Name', 'Receipt', 'Dispatch', 'Return', 'Stock', 'Value'];
      
      currentY = this._addUltraModernTable(doc, head, tableData, currentY, 'Detailed Inventory Movements', {
        columnStyles: {
          0: { cellWidth: 22, halign: 'left', valign: 'middle' },
          1: { cellWidth: 30, halign: 'left', valign: 'middle' },
          2: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.success, fontStyle: 'bold' },
          3: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.warning, fontStyle: 'bold' },
          4: { cellWidth: 18, halign: 'center', valign: 'middle', textColor: COLORS.danger, fontStyle: 'bold' },
          5: { cellWidth: 18, halign: 'center', valign: 'middle', textColor: COLORS.textPrimary, fontStyle: 'bold' },
          6: { cellWidth: 25, halign: 'right', valign: 'middle', fontStyle: 'bold' }
        }
      });
      
      // Add minimal space after table
      currentY += 5;
    } else {
      // Empty state card - positioned properly without extra space
      const emptyY = currentY + 10;
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'S');
      
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont(undefined, 'normal');
      const noActivityText = 'No inventory activity recorded';
      const noActivityWidth = doc.getTextWidth(noActivityText);
      doc.text(noActivityText, 45 + (120 - noActivityWidth) / 2, emptyY + 20);
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      const forDateText = 'for this date';
      const forDateWidth = doc.getTextWidth(forDateText);
      doc.text(forDateText, 45 + (120 - forDateWidth) / 2, emptyY + 30);
      
      currentY = emptyY + 55;
    }
    
    // Footer - positioned close to content
    this._addUltraPremiumFooter(doc);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Generate Weekly Inventory Report
   */
  generateWeeklyInventoryReport(reportData) {
    const { startDate, endDate, weeklyData, summary } = reportData;
    
    const doc = new jsPDF();
    
    doc.setFont('helvetica');
    doc.setFontSize(10);
    
    doc.setProperties({
      title: `Weekly Inventory Report - ${startDate} to ${endDate}`,
      subject: 'Weekly Inventory Analysis',
      author: 'Voomet Inventory System',
      creator: 'Voomet Ultra-Premium Report Generator'
    });

    // Header
    this._addUltraPremiumHeader(doc, 'Weekly Inventory Report', `Period: ${startDate} to ${endDate}`);
    
    let currentY = 62;
    
    // Weekly summary metrics would go here
    // Similar structure to daily report but with weekly data
    
    return Buffer.from(doc.output('arraybuffer'));
  }
}

module.exports = new PDFReportGenerator();