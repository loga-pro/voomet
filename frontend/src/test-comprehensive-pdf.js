// Test data for comprehensive project report with new fields
const testComprehensiveProjectData = [
  {
    _id: '1',
    customerName: 'ABC Corporation',
    projectName: 'Office Renovation Project',
    stage: 'EXECUTION_STAGE',
    totalProjectValue: 2500000,
    enquiryDate: '2024-01-15',
    // New fields for PDF
    paymentData: {
      totalInvoiceRaised: 1500000,
      totalPaymentReceived: 1000000,
      balanceAmount: 500000
    },
    milestoneData: {
      milestoneCompletionRate: 65,
      completedTasks: 8,
      totalTasks: 12,
      taskCompletionRate: 67
    }
  },
  {
    _id: '2',
    customerName: 'XYZ Industries',
    projectName: 'Factory Construction',
    stage: 'DESIGN_STAGE',
    totalProjectValue: 5000000,
    enquiryDate: '2024-02-01',
    // New fields for PDF
    paymentData: {
      totalInvoiceRaised: 2000000,
      totalPaymentReceived: 1800000,
      balanceAmount: 200000
    },
    milestoneData: {
      milestoneCompletionRate: 40,
      completedTasks: 4,
      totalTasks: 10,
      taskCompletionRate: 40
    }
  }
];

// Simulate the processing that happens in Reports.jsx
const processTestData = (data) => {
  return data.map(project => {
    // Calculate task completion ratio (completed/total)
    const totalTasks = project.milestoneData?.totalTasks || 0;
    const completedTasks = project.milestoneData?.completedTasks || 0;
    const taskCompleted = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '0/0';
    
    return {
      name: project.projectName,
      milestoneCompletion: project.milestoneData?.milestoneCompletionRate || 0,
      paymentReceived: project.paymentData?.totalPaymentReceived || 0,
      balanceAmount: project.paymentData?.balanceAmount || 0,
      stage: project.stage?.replace('_', ' ').toUpperCase() || 'Unknown',
      customerName: project.customerName,
      projectName: project.projectName,
      totalProjectValue: project.totalProjectValue,
      milestoneData: project.milestoneData,
      paymentData: project.paymentData,
      taskCompletionRate: project.milestoneData?.taskCompletionRate || 0,
      // New fields for PDF
      invoiceRaised: project.paymentData?.totalInvoiceRaised || 0,
      taskCompleted: taskCompleted,
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      enquiryDate: project.enquiryDate
    };
  });
};

// Test the PDF generation logic
console.log('Original Test Data:', testComprehensiveProjectData);
console.log('\nProcessed Data for PDF:', processTestData(testComprehensiveProjectData));

// Expected PDF headers for comprehensive project report:
const expectedHeaders = [
  'Customer Name',
  'Project Name', 
  'Stage',
  'Total Value (₹)',
  'Invoice Raised (₹)',
  'Payment Received (₹)',
  'Balance Amount (₹)',
  'Task Completed',
  'Milestone Completion',
  'Enquiry Date'
];

console.log('\nExpected PDF Headers:', expectedHeaders);

// Sample of what the PDF table should look like:
const samplePDFData = processTestData(testComprehensiveProjectData);
console.log('\nSample PDF Table Data:');
samplePDFData.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  console.log(`  Customer Name: ${row.customerName}`);
  console.log(`  Project Name: ${row.projectName}`);
  console.log(`  Stage: ${row.stage}`);
  console.log(`  Total Value: ₹${row.totalProjectValue.toLocaleString()}`);
  console.log(`  Invoice Raised: ₹${row.invoiceRaised.toLocaleString()}`);
  console.log(`  Payment Received: ₹${row.paymentReceived.toLocaleString()}`);
  console.log(`  Balance Amount: ₹${row.balanceAmount.toLocaleString()}`);
  console.log(`  Task Completed: ${row.taskCompleted}`);
  console.log(`  Milestone Completion: ${row.milestoneCompletion}%`);
  console.log(`  Enquiry Date: ${new Date(row.enquiryDate).toLocaleDateString('en-IN')}`);
  console.log('');
});

export { testComprehensiveProjectData, processTestData };