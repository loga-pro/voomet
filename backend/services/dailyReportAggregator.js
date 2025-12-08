const Inventory = require('../models/Inventory');
const moment = require('moment');

class DailyReportAggregator {
  
  async generateDailyReport(targetDate = null) {
    try {
      const date = targetDate ? moment(targetDate) : moment().subtract(1, 'day');
      const startOfDay = date.startOf('day').toDate();
      const endOfDay = date.endOf('day').toDate();
      
      const reportDate = date.format('DD/MM/YYYY');
      
      // Get all inventory items
      const allItems = await Inventory.find({});
      
      let totalReceipts = 0;
      let totalDispatches = 0;
      let totalReturns = 0;
      const detailedItems = [];
      
      allItems.forEach(item => {
        let dailyReceipts = 0;
        let dailyDispatches = 0;
        let dailyReturns = 0;
        
        // Calculate daily receipts
        if (item.receipts && item.receipts.length > 0) {
          dailyReceipts = item.receipts
            .filter(receipt => {
              const receiptDate = moment(receipt.date);
              return receiptDate.isBetween(startOfDay, endOfDay, null, '[]');
            })
            .reduce((sum, receipt) => sum + (receipt.quantity || 0), 0);
        }
        
        // Calculate daily dispatches
        if (item.dispatches && item.dispatches.length > 0) {
          dailyDispatches = item.dispatches
            .filter(dispatch => {
              const dispatchDate = moment(dispatch.date);
              return dispatchDate.isBetween(startOfDay, endOfDay, null, '[]');
            })
            .reduce((sum, dispatch) => sum + (dispatch.quantity || 0), 0);
        }
        
        // Calculate daily returns
        if (item.returns && item.returns.length > 0) {
          dailyReturns = item.returns
            .filter(returnItem => {
              const returnDate = moment(returnItem.date);
              return returnDate.isBetween(startOfDay, endOfDay, null, '[]');
            })
            .reduce((sum, returnItem) => sum + (returnItem.quantity || 0), 0);
        }
        
        // Only include items that had activity on this day
        if (dailyReceipts > 0 || dailyDispatches > 0 || dailyReturns > 0) {
          totalReceipts += dailyReceipts;
          totalDispatches += dailyDispatches;
          totalReturns += dailyReturns;
          
          detailedItems.push({
            scopeOfWork: item.scopeOfWork,
            partName: item.partName,
            partPrice: item.partPrice,
            dailyReceipts,
            dailyDispatches,
            dailyReturns,
            currentStock: item.cumulativeQuantityAtVoomet,
            cumulativePriceValue: item.cumulativePriceValue
          });
        }
      });
      
      return {
        date: reportDate,
        totalReceipts,
        totalDispatches,
        totalReturns,
        netChange: totalReceipts - totalDispatches + totalReturns,
        items: detailedItems,
        reportPeriod: {
          start: startOfDay,
          end: endOfDay
        },
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error generating daily report:', error);
      throw error;
    }
  }
  
  async generateWeeklyReport(endDate = null) {
    try {
      const end = endDate ? moment(endDate) : moment().subtract(1, 'day');
      const start = moment(end).subtract(6, 'days'); // Last 7 days
      
      const dailyReports = [];
      const scopeBreakdown = {};
      
      for (let date = moment(start); date <= end; date.add(1, 'day')) {
        const dailyReport = await this.generateDailyReport(date.format('YYYY-MM-DD'));
        
        // Add daily totals
        dailyReports.push({
          date: date.format('DD/MM/YYYY'),
          receipts: dailyReport.totalReceipts,
          dispatches: dailyReport.totalDispatches,
          returns: dailyReport.totalReturns,
          netChange: dailyReport.netChange
        });
        
        // Aggregate by scope of work
        if (dailyReport.items && dailyReport.items.length > 0) {
          dailyReport.items.forEach(item => {
            if (!scopeBreakdown[item.scopeOfWork]) {
              scopeBreakdown[item.scopeOfWork] = {
                scopeOfWork: item.scopeOfWork,
                totalReceipts: 0,
                totalDispatches: 0,
                totalReturns: 0,
                totalValue: 0,
                dailyBreakdown: []
              };
            }
            
            scopeBreakdown[item.scopeOfWork].totalReceipts += item.dailyReceipts;
            scopeBreakdown[item.scopeOfWork].totalDispatches += item.dailyDispatches;
            scopeBreakdown[item.scopeOfWork].totalReturns += item.dailyReturns;
            scopeBreakdown[item.scopeOfWork].totalValue += item.cumulativePriceValue;
            
            scopeBreakdown[item.scopeOfWork].dailyBreakdown.push({
              date: date.format('DD/MM/YYYY'),
              receipts: item.dailyReceipts,
              dispatches: item.dailyDispatches,
              returns: item.dailyReturns,
              value: item.cumulativePriceValue
            });
          });
        }
      }
      
      // Convert scope breakdown to array
      const weeklyData = Object.values(scopeBreakdown);
      
      return {
        weekStart: start.format('DD/MM/YYYY'),
        weekEnd: end.format('DD/MM/YYYY'),
        dailyReports,
        weeklyData,
        summary: {
          totalReceipts: dailyReports.reduce((sum, day) => sum + day.receipts, 0),
          totalDispatches: dailyReports.reduce((sum, day) => sum + day.dispatches, 0),
          totalReturns: dailyReports.reduce((sum, day) => sum + day.returns, 0),
          totalValue: weeklyData.reduce((sum, scope) => sum + scope.totalValue, 0)
        },
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }
  
  async generateMonthlyReport(year = null, month = null) {
    try {
      const targetYear = year || moment().year();
      const targetMonth = month || moment().month(); // 0-indexed
      
      const startOfMonth = moment([targetYear, targetMonth]).startOf('month');
      const endOfMonth = moment([targetYear, targetMonth]).endOf('month');
      
      const dailyReports = [];
      
      for (let date = moment(startOfMonth); date <= endOfMonth; date.add(1, 'day')) {
        const dailyReport = await this.generateDailyReport(date.format('YYYY-MM-DD'));
        dailyReports.push({
          date: date.format('DD/MM/YYYY'),
          receipts: dailyReport.totalReceipts,
          dispatches: dailyReport.totalDispatches,
          returns: dailyReport.totalReturns,
          netChange: dailyReport.netChange
        });
      }
      
      return {
        month: startOfMonth.format('MMMM YYYY'),
        dailyReports,
        totalReceipts: dailyReports.reduce((sum, day) => sum + day.receipts, 0),
        totalDispatches: dailyReports.reduce((sum, day) => sum + day.dispatches, 0),
        totalReturns: dailyReports.reduce((sum, day) => sum + day.returns, 0),
        generatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error generating monthly report:', error);
      throw error;
    }
  }
  
  async getInventorySummary() {
    try {
      const allItems = await Inventory.find({});
      
      const summary = {
        totalItems: allItems.length,
        totalStockValue: 0,
        totalQuantity: 0,
        itemsByScope: {},
        lowStockItems: []
      };
      
      allItems.forEach(item => {
        summary.totalQuantity += item.cumulativeQuantityAtVoomet || 0;
        summary.totalStockValue += item.cumulativePriceValue || 0;
        
        // Group by scope of work
        if (!summary.itemsByScope[item.scopeOfWork]) {
          summary.itemsByScope[item.scopeOfWork] = {
            count: 0,
            totalQuantity: 0,
            totalValue: 0
          };
        }
        
        summary.itemsByScope[item.scopeOfWork].count++;
        summary.itemsByScope[item.scopeOfWork].totalQuantity += item.cumulativeQuantityAtVoomet || 0;
        summary.itemsByScope[item.scopeOfWork].totalValue += item.cumulativePriceValue || 0;
        
        // Identify low stock items (less than 10 units)
        if (item.cumulativeQuantityAtVoomet < 10) {
          summary.lowStockItems.push({
            scopeOfWork: item.scopeOfWork,
            partName: item.partName,
            currentStock: item.cumulativeQuantityAtVoomet,
            partPrice: item.partPrice
          });
        }
      });
      
      return summary;
      
    } catch (error) {
      console.error('Error getting inventory summary:', error);
      throw error;
    }
  }
}

module.exports = new DailyReportAggregator();