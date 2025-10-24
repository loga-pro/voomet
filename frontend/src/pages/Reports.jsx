import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyRupeeIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShieldCheckIcon,
  EyeIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  projectsAPI,
  milestonesAPI,
  inventoryAPI,
  qualityAPI,
  paymentsAPI,
  vendorPaymentsAPI,
  reportsAPI
} from '../services/api';
import ReportGenerator from '../components/Reports/ReportGenerator';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('project');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, type: '' });
  const [emailAddress, setEmailAddress] = useState('');
  
  // Data states for all report types
  const [projectData, setProjectData] = useState([]);
  const [milestoneData, setMilestoneData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [qualityData, setQualityData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [vendorPaymentData, setVendorPaymentData] = useState([]);
  
  // Chart data states
  const [projectChartData, setProjectChartData] = useState([]);
  const [paymentChartData, setPaymentChartData] = useState([]);
  const [inventoryChartData, setInventoryChartData] = useState([]);
  const [qualityChartData, setQualityChartData] = useState([]);

  useEffect(() => {
    fetchDataForAllReports();
  }, []);

  const fetchDataForAllReports = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        projectsRes,
        milestonesRes,
        inventoryRes,
        qualityRes,
        paymentsRes,
        vendorPaymentsRes
      ] = await Promise.all([
        projectsAPI.getAll(),
        milestonesAPI.getAll(),
        inventoryAPI.getAll(),
        qualityAPI.getAll(),
        paymentsAPI.getAll({ limit: 10000 }), // Get all payments for reports
        vendorPaymentsAPI.getAll({ limit: 10000 }) // Get all vendor payments for reports
      ]);

      setProjectData(projectsRes.data || []);
      setMilestoneData(milestonesRes.data?.milestones || []);
      setInventoryData(inventoryRes.data || []);
      setQualityData(qualityRes.data?.qualityIssues || []);
      setPaymentData(paymentsRes.payments || []);
      setVendorPaymentData(vendorPaymentsRes.payments || []);

      // Process chart data
      processProjectChartData(projectsRes.data || []);
      processPaymentChartData(paymentsRes.data?.payments || [], vendorPaymentsRes.data?.payments || []);
      processInventoryChartData(inventoryRes.data || []);
      processQualityChartData(qualityRes.data?.qualityIssues || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processProjectChartData = (projects) => {
    // Group projects by stage
    const stageCounts = projects.reduce((acc, project) => {
      const stage = project.stage || 'Unknown';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(stageCounts).map(([stage, count]) => ({
      name: stage.replace('_', ' ').toUpperCase(),
      value: count
    }));

    setProjectChartData(chartData);
  };

  const processPaymentChartData = (customerPayments, vendorPayments) => {
    const totalCustomerPayments = customerPayments.reduce((sum, payment) => sum + (payment.totalPayments || 0), 0);
    const totalVendorPayments = vendorPayments.reduce((sum, payment) => sum + (payment.totalPayments || 0), 0);

    const chartData = [
      { name: 'Customer Payments', value: totalCustomerPayments },
      { name: 'Vendor Payments', value: totalVendorPayments }
    ];

    setPaymentChartData(chartData);
  };

  const processInventoryChartData = (inventory) => {
    // Group by scope of work
    const scopeCounts = inventory.reduce((acc, item) => {
      const scope = item.scopeOfWork || 'Unknown';
      acc[scope] = (acc[scope] || 0) + (item.cumulativeQuantityAtVoomet || 0);
      return acc;
    }, {});

    const chartData = Object.entries(scopeCounts).map(([scope, quantity]) => ({
      name: scope.replace('_', ' ').toUpperCase(),
      value: quantity
    }));

    setInventoryChartData(chartData);
  };

  const processQualityChartData = (qualityIssues) => {
    // Group by status
    const statusCounts = qualityIssues.reduce((acc, issue) => {
      const status = issue.status || 'open';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));

    setQualityChartData(chartData);
  };

  const handleView = (item, type) => {
    // Open modal with detailed information
    console.log('View', item, type);
    setViewModal({ isOpen: true, data: item, type });
  };

  const closeViewModal = () => {
    setViewModal({ isOpen: false, data: null, type: '' });
  };

  const renderViewModalContent = () => {
    const { data, type } = viewModal;
    if (!data) return null;

    switch (type) {
      case 'project':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer Name</p>
                <p className="text-sm text-gray-900">{data.customerName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Project Name</p>
                <p className="text-sm text-gray-900">{data.projectName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stage</p>
                <p className="text-sm text-gray-900">{data.stage?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Enquiry Date</p>
                <p className="text-sm text-gray-900">{data.enquiryDate ? new Date(data.enquiryDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-sm text-gray-900">₹{data.totalProjectValue?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Scope of Work</p>
                <p className="text-sm text-gray-900">{data.scopeOfWork?.join(', ') || 'N/A'}</p>
              </div>
            </div>
          </div>
        );
      
      case 'milestone':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Milestone Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-sm text-gray-900">{data.customer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Project Name</p>
                <p className="text-sm text-gray-900">{data.projectName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm text-gray-900">{data.startDate ? new Date(data.startDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-sm text-gray-900">{data.endDate ? new Date(data.endDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm text-gray-900">{data.projectStatus || 'Not Started'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Activities</p>
                <p className="text-sm text-gray-900">{data.tasks ? data.tasks.length : 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Activities</p>
                <p className="text-sm text-gray-900">{data.tasks ? data.tasks.filter(task => task.status === 'Completed').length : 0}</p>
              </div>
            </div>
            
            {data.tasks && data.tasks.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Activities</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion %</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Start</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual End</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.tasks.map((task, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{task.phase || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{task.task || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{task.status || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{task.completion || 0}%</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {task.actualStartDate ? new Date(task.actualStartDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {task.actualEndDate ? new Date(task.actualEndDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'payment':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-sm text-gray-900">{data.customer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Project Name</p>
                <p className="text-sm text-gray-900">{data.projectName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Project Cost</p>
                <p className="text-sm text-gray-900">₹{data.projectCost?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Invoice Raised</p>
                <p className="text-sm text-gray-900">₹{data.totalInvoiceRaised?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Payments</p>
                <p className="text-sm text-gray-900">₹{data.totalPayments?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className="text-sm text-gray-900">₹{data.balanceAmount?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm text-gray-900">{data.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                <p className="text-sm text-gray-900">{data.invoices ? data.invoices.length : 0}</p>
              </div>
            </div>
            
            {data.invoices && data.invoices.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.invoices.map((invoice, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{invoice.invoiceNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{invoice.invoiceValue?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {invoice.payments && invoice.payments.length > 0 ? (
                              <div>
                                <p>{invoice.payments.length} payment(s)</p>
                                <div className="mt-1 text-xs">
                                  {invoice.payments.map((payment, pIndex) => (
                                    <div key={pIndex}>
                                      ₹{payment.amount?.toLocaleString() || '0'} on{' '}
                                      {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              'No payments'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'vendor':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Vendor Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Vendor</p>
                <p className="text-sm text-gray-900">{data.vendor || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">GST Number</p>
                <p className="text-sm text-gray-900">{data.vendorGstNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Account Number</p>
                <p className="text-sm text-gray-900">{data.vendorAccountNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Invoice Raised</p>
                <p className="text-sm text-gray-900">₹{data.totalInvoiceRaised?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Payments</p>
                <p className="text-sm text-gray-900">₹{data.totalPayments?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className="text-sm text-gray-900">₹{data.balanceAmount?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm text-gray-900">{data.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                <p className="text-sm text-gray-900">{data.invoices ? data.invoices.length : 0}</p>
              </div>
            </div>
            
            {data.invoices && data.invoices.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Invoices</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payments</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.invoices.map((invoice, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{invoice.invoiceNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{invoice.invoiceValue?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {invoice.payments && invoice.payments.length > 0 ? (
                              <div>
                                <p>{invoice.payments.length} payment(s)</p>
                                <div className="mt-1 text-xs">
                                  {invoice.payments.map((payment, pIndex) => (
                                    <div key={pIndex}>
                                      ₹{payment.amount?.toLocaleString() || '0'} on{' '}
                                      {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              'No payments'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium text-gray-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className="text-sm text-gray-900">
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value, null, 2)
                      : String(value || 'N/A')
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  const handleSend = (item, type) => {
    // Placeholder for send functionality
    console.log('Send', item, type);
    alert(`Sending ${type} report for: ${item._id || item.projectName || item.customer}`);
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Handle special cases
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (data, filename) => {
    if (!data || data.length === 0) return;

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(activeReportConfig.title, 14, 22);

    // Prepare table data
    const headers = activeReportConfig.columns.map(col => col.header);
    const body = data.map(item =>
      activeReportConfig.columns.map(col => {
        const value = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
        return value || '';
      })
    );

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(filename.replace('.csv', '.pdf'));
  };

  const sendEmail = async () => {
    if (!emailAddress.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      await reportsAPI.sendEmail({
        email: emailAddress,
        reportType: activeReport
      });
      alert('Report sent successfully via email!');
      setEmailAddress('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert(`Failed to send email: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Report configurations
  const reportTypes = [
    { id: 'project', name: 'Project Reports', icon: ClipboardDocumentListIcon },
    { id: 'milestone', name: 'Milestone Reports', icon: DocumentTextIcon },
    { id: 'inventory', name: 'Inventory Reports', icon: CubeIcon },
    { id: 'quality', name: 'Quality Reports', icon: ShieldCheckIcon },
    { id: 'payment', name: 'Payment Reports', icon: CurrencyRupeeIcon },
    { id: 'vendor', name: 'Vendor Payment Reports', icon: BuildingStorefrontIcon }
  ];

  // Project Report Configuration
  const projectReportConfig = {
    title: 'Project Reports',
    data: projectData,
    columns: [
      { header: 'Customer Name', accessor: 'customerName' },
      { header: 'Project Name', accessor: 'projectName' },
      { header: 'Stage', accessor: row => row.stage?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Enquiry Date', accessor: row => new Date(row.enquiryDate).toLocaleDateString() },
      { header: 'Total Value (₹)', accessor: row => `₹${row.totalProjectValue?.toLocaleString() || '0'}` },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'project')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'project')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'project-report.csv'
  };

  // Milestone Report Configuration
  const milestoneReportConfig = {
    title: 'Milestone Reports',
    data: milestoneData,
    columns: [
      { header: 'Customer', accessor: 'customer' },
      { header: 'Project Name', accessor: 'projectName' },
      { header: 'Start Date', accessor: row => row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A' },
      { header: 'End Date', accessor: row => row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A' },
      { header: 'Status', accessor: row => row.projectStatus || 'Not Started' },
      {
        header: 'Total Activities',
        accessor: row => row.tasks ? row.tasks.length : 0
      },
      {
        header: 'Completed Activities',
        accessor: row => row.tasks ? row.tasks.filter(task => task.status === 'Completed').length : 0
      },
      {
        header: 'Completion %',
        accessor: row => {
          if (!row.tasks || row.tasks.length === 0) return '0%';
          const completed = row.tasks.filter(task => task.status === 'Completed').length;
          return `${Math.round((completed / row.tasks.length) * 100)}%`;
        }
      },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'milestone')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'milestone')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'milestone-report.csv'
  };

  // Inventory Report Configuration
  const inventoryReportConfig = {
    title: 'Inventory Reports',
    data: inventoryData,
    columns: [
      { header: 'Scope of Work', accessor: row => row.scopeOfWork?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Part Name', accessor: 'partName' },
      { header: 'Part Price (₹)', accessor: row => `₹${row.partPrice?.toLocaleString() || '0'}` },
      { header: 'Total Receipts', accessor: row => {
        const total = row.receipts?.reduce((sum, receipt) => sum + (receipt.quantity || 0), 0) || 0;
        return total;
      }},
      { header: 'Date of Receipt', accessor: row => row.dateOfReceipt ? new Date(row.dateOfReceipt).toLocaleDateString() : 'N/A' },
      { header: 'Cumulative Qty', accessor: 'cumulativeQuantityAtVoomet' },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'inventory')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'inventory')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'inventory-report.csv'
  };

  // Quality Report Configuration
  const qualityReportConfig = {
    title: 'Quality Reports',
    data: qualityData,
    columns: [
      { header: 'Customer', accessor: 'customer' },
      { header: 'Scope of Work', accessor: 'scopeOfWork' },
      { header: 'Category', accessor: 'category' },
      { header: 'Status', accessor: 'status' },
      { header: 'Responsibility', accessor: 'responsibility' },
      { header: 'Created Date', accessor: row => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A' },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'quality')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'quality')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'quality-report.csv'
  };

  // Payment Report Configuration
  const paymentReportConfig = {
    title: 'Customer Payment Reports',
    data: paymentData,
    columns: [
      { header: 'Customer', accessor: 'customer' },
      { header: 'Project Name', accessor: 'projectName' },
      { header: 'Project Cost (₹)', accessor: row => `₹${row.projectCost?.toLocaleString() || '0'}` },
      { header: 'Total Invoice Raised (₹)', accessor: row => `₹${row.totalInvoiceRaised?.toLocaleString() || '0'}` },
      { header: 'Total Payments (₹)', accessor: row => `₹${row.totalPayments?.toLocaleString() || '0'}` },
      { header: 'Balance (₹)', accessor: row => `₹${row.balanceAmount?.toLocaleString() || '0'}` },
      { header: 'Status', accessor: 'status' },
      {
        header: 'Total Invoices',
        accessor: row => row.invoices ? row.invoices.length : 0
      },
      {
        header: 'Total Payments Made',
        accessor: row => {
          if (!row.invoices) return 0;
          return row.invoices.reduce((total, invoice) => {
            return total + (invoice.payments ? invoice.payments.length : 0);
          }, 0);
        }
      },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'payment')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'payment')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'payment-report.csv'
  };

  // Vendor Payment Report Configuration
  const vendorPaymentReportConfig = {
    title: 'Vendor Payment Reports',
    data: vendorPaymentData,
    columns: [
      { header: 'Vendor', accessor: 'vendor' },
      { header: 'GST Number', accessor: 'vendorGstNumber' },
      { header: 'Account Number', accessor: 'vendorAccountNumber' },
      { header: 'Total Invoice Raised (₹)', accessor: row => `₹${row.totalInvoiceRaised?.toLocaleString() || '0'}` },
      { header: 'Total Payments (₹)', accessor: row => `₹${row.totalPayments?.toLocaleString() || '0'}` },
      { header: 'Balance (₹)', accessor: row => `₹${row.balanceAmount?.toLocaleString() || '0'}` },
      { header: 'Status', accessor: 'status' },
      {
        header: 'Total Invoices',
        accessor: row => row.invoices ? row.invoices.length : 0
      },
      {
        header: 'Total Payments Made',
        accessor: row => {
          if (!row.invoices) return 0;
          return row.invoices.reduce((total, invoice) => {
            return total + (invoice.payments ? invoice.payments.length : 0);
          }, 0);
        }
      },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'vendor')}
              className="text-blue-600 hover:text-blue-900"
              title="View"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleSend(row, 'vendor')}
              className="text-green-600 hover:text-green-900"
              title="Send"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'vendor-payment-report.csv'
  };

  const getActiveReportConfig = () => {
    switch (activeReport) {
      case 'project':
        return projectReportConfig;
      case 'milestone':
        return milestoneReportConfig;
      case 'inventory':
        return inventoryReportConfig;
      case 'quality':
        return qualityReportConfig;
      case 'payment':
        return paymentReportConfig;
      case 'vendor':
        return vendorPaymentReportConfig;
      default:
        return projectReportConfig;
    }
  };

  const activeReportConfig = getActiveReportConfig();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
     

      {/* Report Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200 ${
                  activeReport === report.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <span className="text-sm font-medium text-center">{report.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visual Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Stage Distribution */}
          {activeReport === 'project' && projectChartData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-3">Project Stage Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {projectChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment Distribution */}
          {activeReport === 'payment' && paymentChartData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-3">Payment Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="value" name="Amount (₹)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Inventory by Scope */}
          {activeReport === 'inventory' && inventoryChartData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-3">Inventory by Scope of Work</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'Quantity']} />
                  <Legend />
                  <Bar dataKey="value" name="Quantity" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Quality Issues by Status */}
          {activeReport === 'quality' && qualityChartData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-3">Quality Issues by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualityChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {qualityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trend Analysis */}
          {activeReport === 'project' && projectData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-3">Project Timeline Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={projectData.map(project => ({
                    date: new Date(project.enquiryDate).toLocaleDateString(),
                    value: project.totalProjectValue || 0
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Project Value']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Project Value (₹)" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Report Data Table */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
    <h2 className="text-lg font-semibold text-gray-900">{activeReportConfig.title}</h2>
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
      <div className="flex-1 sm:flex-none">
        <input
          type="email"
          value={emailAddress}
          onChange={(e) => setEmailAddress(e.target.value)}
          placeholder="Enter email address"
          className="w-full sm:w-64 rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        />
      </div>
      <div className="flex space-x-2">
        <button
          onClick={sendEmail}
          disabled={!emailAddress.trim()}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <EnvelopeIcon className="h-4 w-4 mr-2" />
          Send Email
        </button>
        <button
          onClick={() => exportToCSV(activeReportConfig.data, activeReportConfig.filename)}
          disabled={!activeReportConfig.data || activeReportConfig.data.length === 0}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export CSV
        </button>
        <button
          onClick={() => exportToPDF(activeReportConfig.data, activeReportConfig.filename)}
          disabled={!activeReportConfig.data || activeReportConfig.data.length === 0}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Download PDF
        </button>
      </div>
    </div>
  </div>
  
  {/* Replace the ReportGenerator component with just the table */}
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {activeReportConfig.columns.map((column, index) => (
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
        {activeReportConfig.data.map((item, index) => (
          <tr key={index}>
            {activeReportConfig.columns.map((column, colIndex) => (
              <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {typeof column.accessor === 'function' 
                  ? column.accessor(item) 
                  : item[column.accessor]
                }
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

      {/* View Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div
                className="absolute inset-0 bg-gray-500 opacity-75"
                onClick={closeViewModal}
              ></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    {renderViewModalContent()}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeViewModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;