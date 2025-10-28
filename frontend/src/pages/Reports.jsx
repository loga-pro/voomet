import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
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
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  XMarkIcon
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
  Cell,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
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

const Reports = () => {
  const [activeReport, setActiveReport] = useState('project-comprehensive');
  const [loading, setLoading] = useState(false);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, type: '' });
  const [emailAddress, setEmailAddress] = useState('');
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  
  // Filter state variables
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedScopeOfWork, setSelectedScopeOfWork] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  
  // Data states for all report types
  const [projectData, setProjectData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [qualityData, setQualityData] = useState([]);
  const [vendorPaymentData, setVendorPaymentData] = useState([]);
  
  // Chart data states
  const [projectChartData, setProjectChartData] = useState([]);
  const [inventoryChartData, setInventoryChartData] = useState([]);
  const [qualityChartData, setQualityChartData] = useState([]);
  const [comprehensiveProjectData, setComprehensiveProjectData] = useState([]);
  const [vendorPaymentChartData, setVendorPaymentChartData] = useState([]);

  // Employee report data
  const [employeeReport, setEmployeeReport] = useState([]);
  const [jobsStatus, setJobsStatus] = useState({ open: 0, inProgress: 0, completed: 0 });
  const [employeeOverview, setEmployeeOverview] = useState({ totalProjects: 0, completed: 0, inProgress: 0, open: 0 });

  useEffect(() => {
    fetchDataForAllReports();
  }, []);

  const fetchDataForAllReports = async () => {
    setLoading(true);
    try {
      // Fetch data for all reports in parallel
      const [
        projectsRes,
        inventoryRes,
        qualityRes,
        vendorPaymentsRes,
        comprehensiveProjectsRes
      ] = await Promise.all([
        projectsAPI.getAll(),
        inventoryAPI.getAll(),
        qualityAPI.getAll(),
        vendorPaymentsAPI.getAll({ limit: 10000 }),
        reportsAPI.getComprehensiveProjects()
      ]);

      console.log('Comprehensive projects API response:', comprehensiveProjectsRes);

      setProjectData(projectsRes.data || []);
      setInventoryData(inventoryRes.data || []);
      setQualityData(qualityRes.data?.qualityIssues || []);
      setVendorPaymentData(vendorPaymentsRes.payments || []);

      // Process chart data for all reports
      processProjectChartData(projectsRes.data || []);
      processInventoryChartData(inventoryRes.data || []);
      processQualityChartData(qualityRes.data?.qualityIssues || []);
      processComprehensiveProjectChartData(comprehensiveProjectsRes.data || []);
      processVendorPaymentChartData(vendorPaymentsRes.payments || []);
      
      // Process jobs status and employee data
      processJobsStatus(comprehensiveProjectsRes.data || []);
      processEmployeeOverview(comprehensiveProjectsRes.data || []);
      processEmployeeReport(comprehensiveProjectsRes.data || []);

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

  const processComprehensiveProjectChartData = (comprehensiveProjects) => {
    const completionData = comprehensiveProjects.map(project => {
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
        taskCompletionRate: project.milestoneData?.taskCompletionRate || 0
      };
    });

    setComprehensiveProjectData(completionData);
  };

  const processVendorPaymentChartData = (vendorPayments) => {
    const vendorTotals = vendorPayments.reduce((acc, payment) => {
      const vendor = payment.vendor || 'Unknown Vendor';
      acc[vendor] = (acc[vendor] || 0) + (payment.totalPayments || 0);
      return acc;
    }, {});

    const chartData = Object.entries(vendorTotals)
      .map(([vendor, total]) => ({ name: vendor, value: total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    setVendorPaymentChartData(chartData);
  };

  const processJobsStatus = (projects) => {
    const statusCounts = projects.reduce((acc, project) => {
      const status = project.stage || 'open';
      if (status.includes('completed') || status.includes('Completed')) {
        acc.completed++;
      } else if (status.includes('progress') || status.includes('Progress')) {
        acc.inProgress++;
      } else {
        acc.open++;
      }
      return acc;
    }, { open: 0, inProgress: 0, completed: 0 });

    setJobsStatus(statusCounts);
  };

  const processEmployeeOverview = (projects) => {
    const overview = {
      totalProjects: projects.length,
      completed: projects.filter(p => p.stage?.includes('completed') || p.stage?.includes('Completed')).length,
      inProgress: projects.filter(p => p.stage?.includes('progress') || p.stage?.includes('Progress')).length,
      open: projects.filter(p => !p.stage?.includes('completed') && !p.stage?.includes('progress')).length
    };

    setEmployeeOverview(overview);
  };

  const processEmployeeReport = (data) => {
    // Process employee report data
    setEmployeeReport(data || []);
  };

  const handleView = (item, type) => {
    console.log('View', item, type);
    setViewModal({ isOpen: true, data: item, type });
  };

  const closeViewModal = () => {
    setViewModal({ isOpen: false, data: null, type: '' });
  };

  // Helper functions for dropdown data
  const getUniqueProjects = () => {
    const projects = comprehensiveProjectData.map(item => item.projectName).filter(Boolean);
    return [...new Set(projects)].sort();
  };

  const getUniqueScopeOfWork = () => {
    const scopes = inventoryData.map(item => item.scopeOfWork).filter(Boolean);
    return [...new Set(scopes)].sort();
  };

  const getUniqueCustomers = () => {
    const customers = qualityData.map(item => item.customer).filter(Boolean);
    return [...new Set(customers)].sort();
  };

  const getUniqueVendors = () => {
    const vendors = vendorPaymentData.map(item => item.vendor).filter(Boolean);
    return [...new Set(vendors)].sort();
  };

  // Filter functions for each report type
  const getFilteredComprehensiveProjectData = () => {
    if (!selectedProject) return comprehensiveProjectData;
    return comprehensiveProjectData.filter(item => item.projectName === selectedProject);
  };

  const getFilteredInventoryData = () => {
    if (!selectedScopeOfWork) return inventoryData;
    return inventoryData.filter(item => item.scopeOfWork === selectedScopeOfWork);
  };

  const getFilteredQualityData = () => {
    if (!selectedCustomer) return qualityData;
    return qualityData.filter(item => item.customer === selectedCustomer);
  };

  const getFilteredVendorPaymentData = () => {
    if (!selectedVendor) return vendorPaymentData;
    return vendorPaymentData.filter(item => item.vendor === selectedVendor);
  };

  // Process chart data from filtered datasets
  const processFilteredInventoryChartData = () => {
    const filteredData = getFilteredInventoryData();
    const scopeData = filteredData.reduce((acc, item) => {
      const scope = item.scopeOfWork || 'Unknown';
      acc[scope] = (acc[scope] || 0) + (item.cumulativeQuantityAtVoomet || 0);
      return acc;
    }, {});
    
    return Object.entries(scopeData).map(([name, value]) => ({ name, value }));
  };

  const processFilteredQualityChartData = () => {
    const filteredData = getFilteredQualityData();
    const statusData = filteredData.reduce((acc, item) => {
      const status = item.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(statusData).map(([name, value]) => ({ name, value }));
  };

  const processFilteredVendorPaymentChartData = () => {
    const filteredData = getFilteredVendorPaymentData();
    const vendorTotals = filteredData.reduce((acc, item) => {
      const vendor = item.vendor || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + (item.totalPayments || 0);
      return acc;
    }, {});
    
    return Object.entries(vendorTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  // Get project stage distribution for radar chart
  const getProjectStageRadarData = () => {
    const filteredData = getFilteredComprehensiveProjectData();
    const stageGroups = filteredData.reduce((acc, project) => {
      const stage = project.stage || 'Unknown';
      if (!acc[stage]) {
        acc[stage] = {
          stage: stage,
          count: 0,
          avgCompletion: 0,
          totalValue: 0
        };
      }
      acc[stage].count++;
      acc[stage].avgCompletion += project.taskCompletionRate || 0;
      acc[stage].totalValue += project.totalProjectValue || 0;
      return acc;
    }, {});

    return Object.values(stageGroups).map(group => ({
      stage: group.stage.substring(0, 15),
      projects: group.count,
      completion: Math.round(group.avgCompletion / group.count),
      value: Math.round(group.totalValue / 1000000) // in millions
    }));
  };

  // Get inventory value distribution
  const getInventoryValueData = () => {
    const filteredData = getFilteredInventoryData();
    return filteredData
      .map(item => ({
        name: item.partName?.substring(0, 20) || 'Unknown',
        value: (item.partPrice || 0) * (item.cumulativeQuantityAtVoomet || 0),
        quantity: item.cumulativeQuantityAtVoomet || 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  // Get quality issues trend by category
  const getQualityTrendData = () => {
    const filteredData = getFilteredQualityData();
    const categoryData = filteredData.reduce((acc, item) => {
      const category = item.category || 'Unknown';
      if (!acc[category]) {
        acc[category] = { category, open: 0, resolved: 0, total: 0 };
      }
      acc[category].total++;
      if (item.status === 'open') {
        acc[category].open++;
      } else {
        acc[category].resolved++;
      }
      return acc;
    }, {});

    return Object.values(categoryData);
  };

  // Get vendor payment status distribution
  const getVendorPaymentStatusData = () => {
    const filteredData = getFilteredVendorPaymentData();
    return filteredData.map(item => ({
      name: item.vendor?.substring(0, 15) || 'Unknown',
      paid: item.totalPayments || 0,
      pending: item.balanceAmount || 0,
      total: item.totalInvoiceRaised || 0,
      paymentRate: item.totalInvoiceRaised > 0 
        ? Math.round((item.totalPayments / item.totalInvoiceRaised) * 100) 
        : 0
    })).slice(0, 10);
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const renderViewModalContent = () => {
    const { data, type } = viewModal;
    if (!data) return null;

    switch (type) {
      case 'project-comprehensive':
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
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-sm text-gray-900">₹{data.totalProjectValue?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Milestone Completion</p>
                <p className="text-sm text-gray-900">{data.milestoneData?.milestoneCompletionRate || 0}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Received</p>
                <p className="text-sm text-gray-900">₹{data.paymentData?.totalPaymentReceived?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
        );
      
      case 'inventory':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Scope of Work</p>
                <p className="text-sm text-gray-900">{data.scopeOfWork?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Part Name</p>
                <p className="text-sm text-gray-900">{data.partName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Part Price</p>
                <p className="text-sm text-gray-900">₹{data.partPrice?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cumulative Quantity</p>
                <p className="text-sm text-gray-900">{data.cumulativeQuantityAtVoomet || 0}</p>
              </div>
            </div>
          </div>
        );
      
      case 'quality':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quality Issue Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-sm text-gray-900">{data.customer || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Scope of Work</p>
                <p className="text-sm text-gray-900">{data.scopeOfWork || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-sm text-gray-900">{data.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-sm text-gray-900">{data.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Responsibility</p>
                <p className="text-sm text-gray-900">{data.responsibility || 'N/A'}</p>
              </div>
            </div>
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
            </div>
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

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

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

    try {
      // Use the new BackgroundReportPDFGenerator component for silent generation
      const reportData = {
        reportType: activeReport,
        title: activeReportConfig.title,
        data: data,
        columns: activeReportConfig.columns,
        generatedAt: new Date().toISOString()
      };

      // Create a hidden container div for the React component
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Import React and ReactDOM for dynamic rendering
      Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Reports/BackgroundReportPDFGenerator')
      ]).then(([React, ReactDOM, { default: BackgroundReportPDFGenerator }]) => {
        const root = ReactDOM.createRoot(container);
        
        const handleComplete = (pdfBlob, generatedFilename) => {
          // Auto-download the PDF
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = generatedFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Clean up
          root.unmount();
          document.body.removeChild(container);
        };

        const handleError = (error) => {
          console.error('Error generating PDF:', error);
          root.unmount();
          document.body.removeChild(container);
          
          // Fallback to the old method if the new generator fails
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text(activeReportConfig.title, 14, 22);

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

        // Render the BackgroundReportPDFGenerator component
        root.render(
          React.createElement(BackgroundReportPDFGenerator, {
            reportData: reportData.data,
            reportType: reportData.reportType,
            reportTitle: reportData.title,
            onComplete: handleComplete,
            onError: handleError
          })
        );
      }).catch(error => {
        console.error('Error loading PDF generator:', error);
        document.body.removeChild(container);
        
        // Fallback to the old method if the new generator fails to load
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(activeReportConfig.title, 14, 22);

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
      });
    } catch (error) {
      console.error('Error in exportToPDF:', error);
      
      // Fallback to the old method
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(activeReportConfig.title, 14, 22);

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
    }
  };

  const sendEmail = async () => {
    if (!emailAddress.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!isValidEmail(emailAddress)) {
      alert('Please enter a valid email address (e.g., name@company.com)');
      return;
    }

    try {
      setLoading(true);
      
      // Get the current report data
      const currentData = activeReportConfig.data;
      const currentTitle = activeReportConfig.title;
      
      // Create a hidden container div for the React component
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Import React and ReactDOM for dynamic rendering
      const [React, ReactDOM, { default: BackgroundReportPDFGenerator }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Reports/BackgroundReportPDFGenerator')
      ]);

      const root = ReactDOM.createRoot(container);
      
      return new Promise((resolve, reject) => {
        const handleComplete = async (pdfBlob, generatedFilename) => {
          try {
            // Convert blob to base64 for sending via API
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64PDF = reader.result.split(',')[1];
              
              // Check file size (base64 is ~33% larger than binary)
              const fileSizeInMB = (base64PDF.length * 0.75) / (1024 * 1024);
              console.log(`PDF file size: ${fileSizeInMB.toFixed(2)} MB`);
              
              let emailData = {
                email: emailAddress,
                reportType: activeReport,
                reportTitle: currentTitle,
                reportData: currentData,
                pdfFilename: generatedFilename
              };
              
              // Only include PDF data if file size is reasonable
              if (fileSizeInMB <= 10) { // 10MB limit
                emailData.pdfData = base64PDF;
              } else {
                console.warn('PDF file too large, will generate on backend');
                alert('PDF file is large, generating on server for email...');
              }
              
              // Send the email with or without PDF data
              await reportsAPI.sendEmail(emailData);
              
              alert('Report sent successfully via email!');
              setEmailAddress('');
              
              // Clean up
              root.unmount();
              document.body.removeChild(container);
              setLoading(false);
              resolve();
            };
            reader.onerror = () => {
              throw new Error('Failed to read PDF file');
            };
            reader.readAsDataURL(pdfBlob);
          } catch (error) {
            console.error('Error sending email:', error);
            alert(`Failed to send email: ${error.response?.data?.message || error.message}`);
            
            // Clean up
            root.unmount();
            document.body.removeChild(container);
            setLoading(false);
            reject(error);
          }
        };

        const handleError = (error) => {
          console.error('Error generating PDF for email:', error);
          alert(`Failed to generate PDF for email: ${error.message}`);
          
          // Clean up
          root.unmount();
          document.body.removeChild(container);
          setLoading(false);
          reject(error);
        };

        // Render the BackgroundReportPDFGenerator component
        root.render(
          React.createElement(BackgroundReportPDFGenerator, {
            reportData: currentData,
            reportType: activeReport,
            reportTitle: currentTitle,
            onComplete: handleComplete,
            onError: handleError
          })
        );
      });
    } catch (error) {
      console.error('Error in sendEmail:', error);
      alert(`Failed to send email: ${error.response?.data?.message || error.message}`);
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchDataForAllReports();
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSelectedProject('');
    setSelectedScopeOfWork('');
    setSelectedCustomer('');
    setSelectedVendor('');
  };

  // Clear only filters that are incompatible with the new report type
  const clearIncompatibleFilters = (newReportType) => {
    switch (newReportType) {
      case 'project-comprehensive':
        // Keep project filter, clear others
        setSelectedScopeOfWork('');
        setSelectedCustomer('');
        setSelectedVendor('');
        break;
      case 'inventory':
        // Keep scope of work filter, clear others
        setSelectedProject('');
        setSelectedCustomer('');
        setSelectedVendor('');
        break;
      case 'quality':
        // Keep customer filter, clear others
        setSelectedProject('');
        setSelectedScopeOfWork('');
        setSelectedVendor('');
        break;
      case 'vendor':
        // Keep vendor filter, clear others
        setSelectedProject('');
        setSelectedScopeOfWork('');
        setSelectedCustomer('');
        break;
      default:
        clearAllFilters();
    }
  };

  // Report configurations
  const reportTypes = [
    { id: 'project-comprehensive', name: 'Comprehensive Project Reports', icon: ClipboardDocumentListIcon },
    { id: 'inventory', name: 'Inventory Reports', icon: CubeIcon },
    { id: 'quality', name: 'Quality Reports', icon: ShieldCheckIcon },
    { id: 'vendor', name: 'Vendor Payment Reports', icon: BuildingStorefrontIcon }
  ];

  // Comprehensive Project Report Configuration
  const comprehensiveProjectReportConfig = {
    title: 'Comprehensive Project Reports',
    data: comprehensiveProjectData,
    columns: [
      { header: 'Customer Name', accessor: 'customerName' },
      { header: 'Project Name', accessor: 'projectName' },
      { header: 'Stage', accessor: row => row.stage?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Total Value (₹)', accessor: row => `₹${row.totalProjectValue?.toLocaleString() || '0'}` },
      { header: 'Total Tasks', accessor: row => row.milestoneData?.totalTasks || 0 },
      { header: 'Finished Tasks', accessor: row => row.milestoneData?.completedTasks || 0 },
      { header: 'Task Completion', accessor: row => `${row.milestoneData?.taskCompletionRate || 0}%` },
      { header: 'Payment Received (₹)', accessor: row => `₹${row.paymentData?.totalPaymentReceived?.toLocaleString() || '0'}` },
      { header: 'Balance (₹)', accessor: row => `₹${row.paymentData?.balanceAmount?.toLocaleString() || '0'}` },
      {
        header: 'Actions',
        accessor: (row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => handleView(row, 'project-comprehensive')}
              className="text-blue-600 hover:text-blue-900"
              title="View Details"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </div>
        )
      }
    ],
    filename: 'comprehensive-project-report.csv'
  };

  // Inventory Report Configuration
  const inventoryReportConfig = {
    title: 'Inventory Reports',
    data: inventoryData,
    columns: [
      { header: 'Scope of Work', accessor: row => row.scopeOfWork?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Part Name', accessor: 'partName' },
      { header: 'Part Price (₹)', accessor: row => `₹${row.partPrice?.toLocaleString() || '0'}` },
      { header: 'Cumulative Quantity', accessor: 'cumulativeQuantityAtVoomet' },
      { header: 'Date of Receipt', accessor: row => row.dateOfReceipt ? new Date(row.dateOfReceipt).toLocaleDateString() : 'N/A' },
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
          </div>
        )
      }
    ],
    filename: 'quality-report.csv'
  };

  // Vendor Payment Report Configuration
  const vendorPaymentReportConfig = {
    title: 'Vendor Payment Reports',
    data: vendorPaymentData,
    columns: [
      { header: 'Vendor', accessor: 'vendor' },
      { header: 'GST Number', accessor: 'vendorGstNumber' },
      { header: 'Total Invoice Raised (₹)', accessor: row => `₹${row.totalInvoiceRaised?.toLocaleString() || '0'}` },
      { header: 'Total Payments (₹)', accessor: row => `₹${row.totalPayments?.toLocaleString() || '0'}` },
      { header: 'Balance (₹)', accessor: row => `₹${row.balanceAmount?.toLocaleString() || '0'}` },
      { header: 'Status', accessor: 'status' },
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
          </div>
        )
      }
    ],
    filename: 'vendor-payment-report.csv'
  };

  const getActiveReportConfig = () => {
    switch (activeReport) {
      case 'project-comprehensive':
        return {
          ...comprehensiveProjectReportConfig,
          data: getFilteredComprehensiveProjectData()
        };
      case 'inventory':
        return {
          ...inventoryReportConfig,
          data: getFilteredInventoryData()
        };
      case 'quality':
        return {
          ...qualityReportConfig,
          data: getFilteredQualityData()
        };
      case 'vendor':
        return {
          ...vendorPaymentReportConfig,
          data: getFilteredVendorPaymentData()
        };
      default:
        return {
          ...comprehensiveProjectReportConfig,
          data: getFilteredComprehensiveProjectData()
        };
    }
  };

  const activeReportConfig = getActiveReportConfig();

  // Get current report name for display
  const getCurrentReportName = () => {
    const report = reportTypes.find(r => r.id === activeReport);
    return report ? report.name : 'Select Report Type';
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

  // Check if any filter is active
  const hasActiveFilters = selectedProject || selectedScopeOfWork || selectedCustomer || selectedVendor;

  // Get unfiltered data count for current report type
  const getUnfilteredDataCount = () => {
    switch (activeReport) {
      case 'project-comprehensive':
        return comprehensiveProjectData.length;
      case 'inventory':
        return inventoryData.length;
      case 'quality':
        return qualityData.length;
      case 'vendor':
        return vendorPaymentData.length;
      default:
        return comprehensiveProjectData.length;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Combined Report Type Selection and Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Report Type Selection - Takes 4 columns */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type Selection</h2>
            <div className="relative">
              <button
                type="button"
                className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-3 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                onClick={() => setShowReportDropdown(!showReportDropdown)}
                aria-haspopup="listbox"
                aria-expanded="true"
              >
                <span className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="block truncate">{getCurrentReportName()}</span>
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </button>

              {showReportDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {reportTypes.map((report) => {
                    const Icon = report.icon;
                    return (
                      <button
                        key={report.id}
                        className={`w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 ${
                          activeReport === report.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                        onClick={() => {
                          setActiveReport(report.id);
                          setShowReportDropdown(false);
                          // Clear only incompatible filters when report type changes
                          clearIncompatibleFilters(report.id);
                        }}
                      >
                        <Icon className="h-5 w-5 mr-3 text-gray-400" />
                        <span className="block truncate">{report.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Report Filters - Takes 8 columns */}
          <div className="lg:col-span-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Filter - for Comprehensive Project Reports */}
              {activeReport === 'project-comprehensive' && (
                <div className="relative">
                  <button
                    type="button"
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      selectedProject ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block truncate">{selectedProject || 'All Projects'}</span>
                      {selectedProject && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {showProjectDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                        onClick={() => {
                          setSelectedProject('');
                          setShowProjectDropdown(false);
                        }}
                      >
                        All Projects
                      </button>
                      {getUniqueProjects().map((project) => (
                        <button
                          key={project}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                          onClick={() => {
                            setSelectedProject(project);
                            setShowProjectDropdown(false);
                          }}
                        >
                          {project}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Scope of Work Filter - for Inventory Reports */}
              {activeReport === 'inventory' && (
                <div className="relative">
                  <button
                    type="button"
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      selectedScopeOfWork ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block truncate">{selectedScopeOfWork || 'All Scopes'}</span>
                      {selectedScopeOfWork && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {showScopeDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                        onClick={() => {
                          setSelectedScopeOfWork('');
                          setShowScopeDropdown(false);
                        }}
                      >
                        All Scopes
                      </button>
                      {getUniqueScopeOfWork().map((scope) => (
                        <button
                          key={scope}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                          onClick={() => {
                            setSelectedScopeOfWork(scope);
                            setShowScopeDropdown(false);
                          }}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customer Filter - for Quality Reports */}
              {activeReport === 'quality' && (
                <div className="relative">
                  <button
                    type="button"
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      selectedCustomer ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block truncate">{selectedCustomer || 'All Customers'}</span>
                      {selectedCustomer && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {showCustomerDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                        onClick={() => {
                          setSelectedCustomer('');
                          setShowCustomerDropdown(false);
                        }}
                      >
                        All Customers
                      </button>
                      {getUniqueCustomers().map((customer) => (
                        <button
                          key={customer}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          {customer}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Vendor Filter - for Vendor Payment Reports */}
              {activeReport === 'vendor' && (
                <div className="relative">
                  <button
                    type="button"
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      selectedVendor ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    onClick={() => setShowVendorDropdown(!showVendorDropdown)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block truncate">{selectedVendor || 'All Vendors'}</span>
                      {selectedVendor && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                  
                  {showVendorDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                        onClick={() => {
                          setSelectedVendor('');
                          setShowVendorDropdown(false);
                        }}
                      >
                        All Vendors
                      </button>
                      {getUniqueVendors().map((vendor) => (
                        <button
                          key={vendor}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-900"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setShowVendorDropdown(false);
                          }}
                        >
                          {vendor}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Clear Filters Button - Always in the same row */}
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearAllFilters}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Clear All Filters
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {[
                        selectedProject ? 1 : 0,
                        selectedScopeOfWork ? 1 : 0,
                        selectedCustomer ? 1 : 0,
                        selectedVendor ? 1 : 0
                      ].reduce((a, b) => a + b, 0)}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Options Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export & Actions</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Email Section - Takes up 7 columns on large screens */}
          <div className="lg:col-span-7">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <EnvelopeIcon className="h-4 w-4 inline mr-1" />
              Send Report via Email
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  id="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address (e.g., name@company.com)"
                  className={`w-full px-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 focus:border-transparent text-sm ${
                    emailAddress && !isValidEmail(emailAddress)
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {emailAddress && !isValidEmail(emailAddress) && (
                  <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
                )}
              </div>
              <button
                onClick={sendEmail}
                disabled={!emailAddress.trim() || !isValidEmail(emailAddress) || loading}
                className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                Send Email
              </button>
            </div>
          </div>

          {/* Action Buttons - Takes up 5 columns on large screens */}
          <div className="lg:col-span-5 flex items-end">
            <div className="flex flex-wrap gap-2 w-full">
              <button
                onClick={() => exportToCSV(activeReportConfig.data, activeReportConfig.filename)}
                disabled={!activeReportConfig.data || activeReportConfig.data.length === 0}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              
              <button
                onClick={() => exportToPDF(activeReportConfig.data, activeReportConfig.filename)}
                disabled={!activeReportConfig.data || activeReportConfig.data.length === 0}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download PDF
              </button>
            
              <button
                onClick={refreshData}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual Analytics Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Visual Analytics</h2>
          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Filtered View
              </span>
              <span className="text-sm text-gray-500">
                Showing {activeReportConfig.data.length} of {getUnfilteredDataCount()} records
              </span>
            </div>
          )}
        </div>
        
        {/* Comprehensive Project Charts */}
        {activeReport === 'project-comprehensive' && getFilteredComprehensiveProjectData().length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Completion Bar Chart */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                Task Completion by Project
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFilteredComprehensiveProjectData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Completion']} 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="taskCompletionRate" name="Task Completion (%)" fill="#00C49F" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Overview Stacked Bar Chart */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Payment Overview by Project
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFilteredComprehensiveProjectData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="paymentReceived" name="Payment Received (₹)" fill="#0088FE" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="balanceAmount" name="Balance Amount (₹)" fill="#FF8042" stackId="a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Project Stage Distribution - Radar Chart */}
            {getProjectStageRadarData().length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-purple-600 rounded-full mr-2"></span>
                  Project Stage Analysis
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getProjectStageRadarData()}>
                    <PolarGrid stroke="#e0e0e0" />
                    <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fontSize: 11 }} />
                    <Radar name="Projects Count" dataKey="projects" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Radar name="Avg Completion %" dataKey="completion" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Project Value Distribution - Area Chart */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
                Project Value Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getFilteredComprehensiveProjectData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Value']} 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="totalProjectValue" name="Total Value (₹)" stroke="#FFBB28" fill="#FFBB28" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Inventory Charts */}
        {activeReport === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory by Scope - Bar Chart */}
            {processFilteredInventoryChartData().length > 0 && (
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-cyan-600 rounded-full mr-2"></span>
                  Inventory Quantity by Scope
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processFilteredInventoryChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [value, 'Quantity']} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="value" name="Quantity" fill="#82ca9d" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Inventory Value Distribution - Pie Chart */}
            {getInventoryValueData().length > 0 && (
              <div className="bg-gradient-to-br from-teal-50 to-green-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-teal-600 rounded-full mr-2"></span>
                  Top 10 Inventory Value Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getInventoryValueData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getInventoryValueData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Value']} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Quality Charts */}
        {activeReport === 'quality' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Issues Status - Pie Chart */}
            {processFilteredQualityChartData().length > 0 && (
              <div className="bg-gradient-to-br from-rose-50 to-red-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-rose-600 rounded-full mr-2"></span>
                  Quality Issues by Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={processFilteredQualityChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {processFilteredQualityChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, 'Count']} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quality Issues Trend by Category */}
            {getQualityTrendData().length > 0 && (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-violet-600 rounded-full mr-2"></span>
                  Quality Issues by Category
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getQualityTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="open" name="Open Issues" fill="#FF8042" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="resolved" name="Resolved Issues" fill="#00C49F" stackId="a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Vendor Payment Charts */}
        {activeReport === 'vendor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vendor Payments - Bar Chart */}
            {processFilteredVendorPaymentChartData().length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></span>
                  Top 10 Vendor Payments
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processFilteredVendorPaymentChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Total Payment']} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="value" name="Total Payment (₹)" fill="#8884d8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Vendor Payment Status - Stacked Bar */}
            {getVendorPaymentStatusData().length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-lg shadow-sm">
                <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full mr-2"></span>
                  Vendor Payment Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getVendorPaymentStatusData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="paid" name="Paid (₹)" fill="#00C49F" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" name="Pending (₹)" fill="#FFBB28" stackId="a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{activeReportConfig.title}</h2>
        
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
                <tr key={index} className="hover:bg-gray-50 transition-colors">
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
          {activeReportConfig.data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No data available for the selected filters</p>
            </div>
          )}
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