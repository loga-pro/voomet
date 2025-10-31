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
   * Add ultra-premium header with modern design - COMPLETELY FIXED
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
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.triangle(pageWidth - 80, 0, pageWidth, 0, pageWidth, 50, 'F');
    doc.triangle(pageWidth - 40, 0, pageWidth, 0, pageWidth, 50, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    // Company branding - left side (FIXED COMPANY NAME - VOOMET)
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('VOOMET', 15, 18);
    
    // Separator circle
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.3 }));
    doc.circle(37, 16, 1.2, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.setFont('helvetica', 'normal');
    doc.text('Inventory Management System', 42, 18);
    
    // Main title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, 15, 34);
    
    // Subtitle - FIXED: Proper date validation and formatting
    if (subtitle && !subtitle.includes('undefined') && !subtitle.includes('N/A')) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(subtitle, 15, 43);
    } else {
      // Fallback subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      const currentWeek = `Week ${moment().isoWeek()}, ${moment().format('YYYY')}`;
      doc.text(`Weekly Report - ${currentWeek}`, 15, 43);
    }
    
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
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');
    
    // Subtile border
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
    
    // Title - CENTERED
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textSecondary);
    doc.setFont('helvetica', 'normal');
    
    // Fix card titles
    let displayTitle = title;
    if (title === 'TOTAL RECEIPTS') displayTitle = 'RECEIPTS';
    if (title === 'TOTAL DISPATCHES') displayTitle = 'DISPATCHES';
    if (title === 'TOTAL RETURNS') displayTitle = 'RETURNS';
    if (title === 'NET CHANGE') displayTitle = 'NET CHANGE';
    
    const titleWidth = doc.getTextWidth(displayTitle);
    doc.text(displayTitle, x + (width - titleWidth) / 2, y + height - 14);
    
    // Value - CENTERED and prominent
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.main);
    
    // Ensure value is properly formatted
    let valueText;
    if (value === undefined || value === null || isNaN(value)) {
      valueText = '0';
    } else {
      valueText = value.toString();
    }
    
    const valueWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + (width - valueWidth) / 2, y + height - 4);
  }

  /**
   * Add modern bar chart visualization
   */
  _addModernBarChart(doc, x, y, width, height, data, title) {
    // Card with shadow
    doc.setFillColor(15, 23, 42);
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
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
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + 8, y + 12);
    
    // Chart area
    const chartPadding = 12;
    const chartX = x + chartPadding;
    const chartY = y + 24;
    const chartWidth = width - chartPadding * 2;
    const chartHeight = height - 34;
    
    // Find max value for scaling
    const validData = data.filter(d => d.value !== undefined && d.value !== null && !isNaN(d.value));
    const maxValue = validData.length > 0 ? Math.max(...validData.map(d => d.value), 1) : 1;
    
    // Calculate bar dimensions
    const barCount = validData.length;
    const totalSpacing = chartWidth * 0.2;
    const barSpacing = totalSpacing / (barCount + 1);
    const barWidth = (chartWidth - totalSpacing) / barCount;
    
    // Draw bars
    validData.forEach((item, index) => {
      const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
      const barX = chartX + barSpacing + index * (barWidth + barSpacing);
      const barY = chartY + chartHeight - barHeight;
      
      // Bar shadow
      doc.setFillColor(0, 0, 0);
      doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.roundedRect(barX + 0.5, barY + 0.5, barWidth, barHeight, 2, 2, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
      
      // Bar
      doc.setFillColor(...item.color);
      doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F');
      
      // Value on top or inside
      if (barHeight > 8) {
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        const valueText = item.value.toString();
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + (barWidth - textWidth) / 2, barY + barHeight/2 + 2);
      } else if (item.value > 0) {
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFont('helvetica', 'bold');
        const valueText = item.value.toString();
        const textWidth = doc.getTextWidth(valueText);
        doc.text(valueText, barX + (barWidth - textWidth) / 2, barY - 3);
      }
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
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
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    
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
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 8, y + height/2 - 8);
    
    // Large value
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.info);
    
    let valueText;
    if (value === undefined || value === null) {
      valueText = '₹0';
    } else {
      valueText = value.toString();
    }
    
    const valueWidth = doc.getTextWidth(valueText);
    doc.text(valueText, x + (width - valueWidth) / 2, y + height/2 + 10);
    
    // Sublabel
    if (sublabel) {
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text(title, 15, startY);
    
    // Accent underline
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(3);
    doc.line(15, startY + 2, 65, startY + 2);
    
    const tableStartY = startY + 10;
    
    const tableOptions = {
      head: [head],
      body: body,
      startY: tableStartY,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 1,
        overflow: 'ellipsize',
        lineColor: COLORS.border,
        lineWidth: 0.3,
        textColor: COLORS.textPrimary,
        font: 'helvetica',
        fontStyle: 'normal',
        halign: 'left',
        valign: 'middle',
        minCellHeight: 6,
        lineHeight: 0.9
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: COLORS.textPrimary,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2,
        lineColor: COLORS.border,
        lineWidth: 0.5,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8,
        lineHeight: 0.9
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: COLORS.textPrimary,
        fontStyle: 'normal',
        lineColor: COLORS.border,
        lineWidth: 0.2,
        minCellHeight: 6,
        lineHeight: 0.9
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'wrap',
      tableLineWidth: 0.3,
      tableLineColor: COLORS.border
    };

    if (options.columnStyles) {
      tableOptions.columnStyles = options.columnStyles;
    }

    tableOptions.didParseCell = function (data) {
      if (data.section === 'head') {
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
        data.cell.styles.lineHeight = 0.9;
        data.cell.styles.minCellHeight = 8;
        data.cell.styles.overflow = 'ellipsize';
      }
      
      data.cell.styles.cellPadding = 1;
    };

    tableOptions.didDrawCell = (data) => {
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
   * Add ultra-premium footer with adjusted spacing - FIXED COMPANY NAME
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
      
      // Footer text - FIXED COMPANY NAME
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont('helvetica', 'normal');
      doc.text('Automated Report by Voomet Inventory Management System', 15, footerY);
      
      // Page number
      doc.setFont('helvetica', 'bold');
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
   * Generate Weekly Inventory Report - COMPLETELY FIXED VERSION
   */
  generateWeeklyInventoryReport(reportData) {
    console.log('🔧 DEBUG - Weekly Report Data:', JSON.stringify(reportData, null, 2));
    
    // FIXED: Enhanced data validation with better fallbacks
    if (!reportData) {
      console.error('❌ Report data is undefined');
      throw new Error('Report data is undefined');
    }

    const { startDate, endDate, weeklyData, summary } = reportData;
    
    // FIXED: Better date handling with moment.js fallbacks
    let safeStartDate, safeEndDate;
    
    if (startDate && startDate !== 'undefined' && startDate !== 'N/A') {
      safeStartDate = startDate;
    } else {
      // Calculate last week if dates are missing
      safeStartDate = moment().subtract(1, 'week').startOf('week').format('DD/MM/YYYY');
    }
    
    if (endDate && endDate !== 'undefined' && endDate !== 'N/A') {
      safeEndDate = endDate;
    } else {
      safeEndDate = moment().subtract(1, 'week').endOf('week').format('DD/MM/YYYY');
    }
    
    const safeSummary = summary || {
      totalReceipts: 0,
      totalDispatches: 0,
      totalReturns: 0,
      totalValue: 0
    };
    
    const safeWeeklyData = weeklyData || [];
    
    console.log('📅 Using dates:', { safeStartDate, safeEndDate });
    
    const doc = new jsPDF();
    
    doc.setFont('helvetica');
    doc.setFontSize(10);
    
    doc.setProperties({
      title: `Weekly Inventory Report - ${safeStartDate} to ${safeEndDate}`,
      subject: 'Weekly Inventory Analysis',
      author: 'Voomet Inventory System',
      creator: 'Voomet Ultra-Premium Report Generator'
    });

    // Header with safe dates
    this._addUltraPremiumHeader(doc, 'Weekly Inventory Report', `Period: ${safeStartDate} to ${safeEndDate}`);
    
    let currentY = 62;
    
    // Weekly Summary Metrics Cards
    const cardWidth = 44;
    const cardHeight = 38;
    const cardSpacing = 4;
    const startX = 15;
    
    this._addModernMetricCard(
      doc, startX, currentY, cardWidth, cardHeight,
      'TOTAL RECEIPTS', safeSummary.totalReceipts || 0, 'up',
      { main: COLORS.success, bg: COLORS.successBg }
    );
    
    this._addModernMetricCard(
      doc, startX + cardWidth + cardSpacing, currentY, cardWidth, cardHeight,
      'TOTAL DISPATCHES', safeSummary.totalDispatches || 0, 'down',
      { main: COLORS.warning, bg: COLORS.warningBg }
    );
    
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 2, currentY, cardWidth, cardHeight,
      'TOTAL RETURNS', safeSummary.totalReturns || 0, 'refresh',
      { main: COLORS.danger, bg: COLORS.dangerBg }
    );
    
    const netChange = (safeSummary.totalReceipts || 0) - (safeSummary.totalDispatches || 0) + (safeSummary.totalReturns || 0);
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 3, currentY, cardWidth, cardHeight,
      'NET CHANGE', netChange, 'chart',
      { main: COLORS.info, bg: COLORS.infoBg }
    );
    
    currentY += cardHeight + 8;
    
    // Weekly Activity Bar Chart
    if (safeWeeklyData.length > 0) {
      const chartData = [
        { label: 'Receipts', value: safeSummary.totalReceipts || 0, color: COLORS.success },
        { label: 'Dispatches', value: safeSummary.totalDispatches || 0, color: COLORS.warning },
        { label: 'Returns', value: safeSummary.totalReturns || 0, color: COLORS.danger }
      ];
      
      this._addModernBarChart(doc, 15, currentY, 110, 58, chartData, 'Weekly Activity Overview');
      
      // Total Value Info Panel
      this._addModernInfoPanel(
        doc, 130, currentY, 65, 58,
        'Total Inventory Value',
        `₹${this._formatCurrencyValue(safeSummary.totalValue || 0)}`,
        'Combined value of all inventory movements'
      );
      
      currentY += 68;
      
      // Scope of Work Breakdown Table - FIXED: Proper data mapping and value formatting
      const tableData = safeWeeklyData.map(scope => {
        const scopeValue = scope.totalValue || 0;
        return [
          scope.scopeOfWork || 'N/A',
          (scope.totalReceipts || 0).toString(),
          (scope.totalDispatches || 0).toString(),
          (scope.totalReturns || 0).toString(),
          `₹${this._formatCurrencyValue(scopeValue)}`
        ];
      });
      
      // Add total row at the end
      tableData.push([
        'TOTAL',
        (safeSummary.totalReceipts || 0).toString(),
        (safeSummary.totalDispatches || 0).toString(),
        (safeSummary.totalReturns || 0).toString(),
        `₹${this._formatCurrencyValue(safeSummary.totalValue || 0)}`
      ]);
      
      const head = ['Scope of Work', 'Receipts', 'Dispatches', 'Returns', 'Value'];
      
      currentY = this._addUltraModernTable(doc, head, tableData, currentY, 'Scope of Work Breakdown', {
        columnStyles: {
          0: { cellWidth: 45, halign: 'left', valign: 'middle' },
          1: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.success, fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.warning, fontStyle: 'bold' },
          3: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.danger, fontStyle: 'bold' },
          4: { cellWidth: 30, halign: 'right', valign: 'middle', fontStyle: 'bold' }
        }
      });
      
      currentY += 5;
      
      // Daily Breakdown Section
      if (safeWeeklyData.some(scope => scope.dailyBreakdown && scope.dailyBreakdown.length > 0)) {
        this._addDailyBreakdownSection(doc, safeWeeklyData, currentY);
      }
    } else {
      // Empty state
      const emptyY = currentY + 10;
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'S');
      
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
      const noActivityText = 'No weekly activity recorded';
      const noActivityWidth = doc.getTextWidth(noActivityText);
      doc.text(noActivityText, 45 + (120 - noActivityWidth) / 2, emptyY + 20);
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      const forPeriodText = `for period ${safeStartDate} to ${safeEndDate}`;
      const forPeriodWidth = doc.getTextWidth(forPeriodText);
      doc.text(forPeriodText, 45 + (120 - forPeriodWidth) / 2, emptyY + 30);
      
      currentY = emptyY + 55;
    }
    
    // Footer
    this._addUltraPremiumFooter(doc);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Add Daily Breakdown Section for Weekly Report - FIXED NET CHANGE CALCULATION
   */
  _addDailyBreakdownSection(doc, weeklyData, startY) {
    let currentY = startY + 10;
    
    // Section Title
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Breakdown by Scope', 15, currentY);
    
    currentY += 15;
    
    // Process each scope
    weeklyData.forEach(scope => {
      if (scope.dailyBreakdown && scope.dailyBreakdown.length > 0) {
        // Scope Header - FIXED: Use proper scope name
        const scopeName = scope.scopeOfWork || 'Unknown Scope';
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFont('helvetica', 'bold');
        doc.text(scopeName, 15, currentY);
        
        currentY += 8;
        
        // Daily breakdown table for this scope - FIXED NET CHANGE CALCULATION
        const tableData = scope.dailyBreakdown.map(day => {
          // Calculate net change properly: Receipts - Dispatches + Returns
          const receipts = parseInt(day.receipts) || 0;
          const dispatches = parseInt(day.dispatches) || 0;
          const returns = parseInt(day.returns) || 0;
          const netChange = receipts - dispatches + returns;
          
          return [
            day.date || 'N/A',
            receipts.toString(),
            dispatches.toString(),
            returns.toString(),
            netChange.toString()
          ];
        });
        
        // Calculate scope totals properly
        const scopeTotalReceipts = parseInt(scope.totalReceipts) || 0;
        const scopeTotalDispatches = parseInt(scope.totalDispatches) || 0;
        const scopeTotalReturns = parseInt(scope.totalReturns) || 0;
        const scopeNetChange = scopeTotalReceipts - scopeTotalDispatches + scopeTotalReturns;
        
        // Add scope total row at the end - FIXED: Use proper scope name
        tableData.push([
          `${scopeName.toUpperCase()} TOTAL`,
          scopeTotalReceipts.toString(),
          scopeTotalDispatches.toString(),
          scopeTotalReturns.toString(),
          scopeNetChange.toString()
        ]);
        
        const head = ['Date', 'Receipts', 'Dispatches', 'Returns', 'Net Change'];
        
        // Check if we need a new page
        if (currentY > 200) {
          doc.addPage();
          currentY = 30;
        }
        
        currentY = this._addUltraModernTable(doc, head, tableData, currentY, '', {
          columnStyles: {
            0: { cellWidth: 25, halign: 'left', valign: 'middle' },
            1: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.success, fontStyle: 'bold' },
            2: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.warning, fontStyle: 'bold' },
            3: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.danger, fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.info, fontStyle: 'bold' }
          }
        });
        
        currentY += 10;
        
        // Add spacing between scopes
        if (currentY > 180) {
          doc.addPage();
          currentY = 30;
        } else {
          currentY += 5;
        }
      }
    });
  }

  /**
   * Helper method to format currency values - FIXED FORMATTING
   */
  _formatCurrencyValue(value) {
    const numValue = Number(value) || 0;
    
    if (numValue >= 10000000) {
      return (numValue / 10000000).toFixed(2) + 'Cr';
    } else if (numValue >= 100000) {
      return (numValue / 100000).toFixed(2) + 'L';
    } else if (numValue >= 1000) {
      return (numValue / 1000).toFixed(2) + 'K';
    } else {
      return numValue.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
  }

  /**
   * Generate Daily Inventory Report (unchanged)
   */
 generateWeeklyInventoryReport(reportData) {
    // FIXED: Ensure reportData has proper structure
    if (!reportData) {
      throw new Error('Report data is undefined');
    }

    const { startDate, endDate, weeklyData, summary } = reportData;
    
    // FIXED: Validate and provide fallbacks for critical data
    const safeStartDate = startDate && startDate !== 'undefined' ? startDate : 'N/A';
    const safeEndDate = endDate && endDate !== 'undefined' ? endDate : 'N/A';
    const safeSummary = summary || {
      totalReceipts: 0,
      totalDispatches: 0,
      totalReturns: 0,
      totalValue: 0
    };
    const safeWeeklyData = weeklyData || [];
    
    const doc = new jsPDF();
    
    doc.setFont('helvetica');
    doc.setFontSize(10);
    
    doc.setProperties({
      title: `Weekly Inventory Report - ${safeStartDate} to ${safeEndDate}`,
      subject: 'Weekly Inventory Analysis',
      author: 'Voomet Inventory System',
      creator: 'Voomet Ultra-Premium Report Generator'
    });

    // Header with safe dates
    this._addUltraPremiumHeader(doc, 'Weekly Inventory Report', `Period: ${safeStartDate} to ${safeEndDate}`);
    
    let currentY = 62;
    
    // Weekly Summary Metrics Cards with safe values
    const cardWidth = 44;
    const cardHeight = 38;
    const cardSpacing = 4;
    const startX = 15;
    
    this._addModernMetricCard(
      doc, startX, currentY, cardWidth, cardHeight,
      'TOTAL RECEIPTS', safeSummary.totalReceipts || 0, 'up',
      { main: COLORS.success, bg: COLORS.successBg }
    );
    
    this._addModernMetricCard(
      doc, startX + cardWidth + cardSpacing, currentY, cardWidth, cardHeight,
      'TOTAL DISPATCHES', safeSummary.totalDispatches || 0, 'down',
      { main: COLORS.warning, bg: COLORS.warningBg }
    );
    
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 2, currentY, cardWidth, cardHeight,
      'TOTAL RETURNS', safeSummary.totalReturns || 0, 'refresh',
      { main: COLORS.danger, bg: COLORS.dangerBg }
    );
    
    const netChange = (safeSummary.totalReceipts || 0) - (safeSummary.totalDispatches || 0) + (safeSummary.totalReturns || 0);
    this._addModernMetricCard(
      doc, startX + (cardWidth + cardSpacing) * 3, currentY, cardWidth, cardHeight,
      'NET CHANGE', netChange, 'chart',
      { main: COLORS.info, bg: COLORS.infoBg }
    );
    
    currentY += cardHeight + 8;
    
    // Weekly Activity Bar Chart
    if (safeWeeklyData.length > 0) {
      const chartData = [
        { label: 'Receipts', value: safeSummary.totalReceipts || 0, color: COLORS.success },
        { label: 'Dispatches', value: safeSummary.totalDispatches || 0, color: COLORS.warning },
        { label: 'Returns', value: safeSummary.totalReturns || 0, color: COLORS.danger }
      ];
      
      this._addModernBarChart(doc, 15, currentY, 110, 58, chartData, 'Weekly Activity Overview');
      
      // Total Value Info Panel
      this._addModernInfoPanel(
        doc, 130, currentY, 65, 58,
        'Total Inventory Value',
        `₹${this._formatCurrencyValue(safeSummary.totalValue || 0)}`,
        'Combined value of all inventory movements'
      );
      
      currentY += 68;
      
      // Scope of Work Breakdown Table - FIXED: Proper data mapping
      const tableData = safeWeeklyData.map(scope => {
        const scopeValue = scope.totalValue || 0;
        return [
          scope.scopeOfWork || 'N/A',
          (scope.totalReceipts || 0).toString(),
          (scope.totalDispatches || 0).toString(),
          (scope.totalReturns || 0).toString(),
          `₹${this._formatCurrencyValue(scopeValue)}`
        ];
      });
      
      // Add total row at the end
      tableData.push([
        'TOTAL',
        (safeSummary.totalReceipts || 0).toString(),
        (safeSummary.totalDispatches || 0).toString(),
        (safeSummary.totalReturns || 0).toString(),
        `₹${this._formatCurrencyValue(safeSummary.totalValue || 0)}`
      ]);
      
      const head = ['Scope of Work', 'Receipts', 'Dispatches', 'Returns', 'Value'];
      
      currentY = this._addUltraModernTable(doc, head, tableData, currentY, 'Scope of Work Breakdown', {
        columnStyles: {
          0: { cellWidth: 45, halign: 'left', valign: 'middle' },
          1: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.success, fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.warning, fontStyle: 'bold' },
          3: { cellWidth: 25, halign: 'center', valign: 'middle', textColor: COLORS.danger, fontStyle: 'bold' },
          4: { cellWidth: 30, halign: 'right', valign: 'middle', fontStyle: 'bold' }
        }
      });
      
      currentY += 5;
      
      // Daily Breakdown Section - FIXED: Use the corrected version
      if (safeWeeklyData.some(scope => scope.dailyBreakdown && scope.dailyBreakdown.length > 0)) {
        this._addDailyBreakdownSection(doc, safeWeeklyData, currentY);
      }
    } else {
      // Empty state
      const emptyY = currentY + 10;
      doc.setFillColor(...COLORS.background);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(45, emptyY, 120, 45, 4, 4, 'S');
      
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
      const noActivityText = 'No weekly activity recorded';
      const noActivityWidth = doc.getTextWidth(noActivityText);
      doc.text(noActivityText, 45 + (120 - noActivityWidth) / 2, emptyY + 20);
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      const forPeriodText = `for period ${safeStartDate} to ${safeEndDate}`;
      const forPeriodWidth = doc.getTextWidth(forPeriodText);
      doc.text(forPeriodText, 45 + (120 - forPeriodWidth) / 2, emptyY + 30);
    }
    
    // Footer
    this._addUltraPremiumFooter(doc);
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  /**
   * Add Daily Breakdown Section for Weekly Report - FIXED NET CHANGE CALCULATION
   */
  _addDailyBreakdownSection(doc, weeklyData, startY) {
    let currentY = startY + 10;
    
    // Section Title
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Breakdown by Scope', 15, currentY);
    
    currentY += 15;
    
    // Process each scope
    weeklyData.forEach(scope => {
      if (scope.dailyBreakdown && scope.dailyBreakdown.length > 0) {
        // Scope Header
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFont('helvetica', 'bold');
        doc.text(`${scope.scopeOfWork || 'Unknown Scope'}`, 15, currentY);
        
        currentY += 8;
        
        // Daily breakdown table for this scope - FIXED NET CHANGE CALCULATION
        const tableData = scope.dailyBreakdown.map(day => {
          // Calculate net change properly: Receipts - Dispatches + Returns
          const receipts = parseInt(day.receipts) || 0;
          const dispatches = parseInt(day.dispatches) || 0;
          const returns = parseInt(day.returns) || 0;
          const netChange = receipts - dispatches + returns;
          
          return [
            day.date || 'N/A',
            receipts.toString(),
            dispatches.toString(),
            returns.toString(),
            netChange.toString() // This was the problem - now properly calculated
          ];
        });
        
        // Calculate scope totals properly
        const scopeTotalReceipts = parseInt(scope.totalReceipts) || 0;
        const scopeTotalDispatches = parseInt(scope.totalDispatches) || 0;
        const scopeTotalReturns = parseInt(scope.totalReturns) || 0;
        const scopeNetChange = scopeTotalReceipts - scopeTotalDispatches + scopeTotalReturns;
        
        // Add scope total row at the end
        tableData.push([
          'SCOPE TOTAL',
          scopeTotalReceipts.toString(),
          scopeTotalDispatches.toString(),
          scopeTotalReturns.toString(),
          scopeNetChange.toString()
        ]);
        
        const head = ['Date', 'Receipts', 'Dispatches', 'Returns', 'Net Change'];
        
        // Check if we need a new page
        if (currentY > 200) {
          doc.addPage();
          currentY = 30;
        }
        
        currentY = this._addUltraModernTable(doc, head, tableData, currentY, '', {
          columnStyles: {
            0: { cellWidth: 25, halign: 'left', valign: 'middle' },
            1: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.success, fontStyle: 'bold' },
            2: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.warning, fontStyle: 'bold' },
            3: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.danger, fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', valign: 'middle', textColor: COLORS.info, fontStyle: 'bold' }
          }
        });
        
        currentY += 10;
        
        // Add spacing between scopes
        if (currentY > 180) {
          doc.addPage();
          currentY = 30;
        } else {
          currentY += 5;
        }
      }
    });
  }

  /**
   * Helper method to format currency values
   */
  _formatCurrencyValue(value) {
    const numValue = Number(value) || 0;
    
    if (numValue >= 10000000) {
      return (numValue / 10000000).toFixed(2) + 'Cr';
    } else if (numValue >= 100000) {
      return (numValue / 100000).toFixed(2) + 'L';
    } else if (numValue >= 1000) {
      return (numValue / 1000).toFixed(2) + 'K';
    } else {
      return numValue.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
  }
}

module.exports = new PDFReportGenerator();