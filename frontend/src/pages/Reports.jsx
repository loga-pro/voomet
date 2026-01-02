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
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon, // Added for Quality
  ExclamationCircleIcon,
  ExclamationTriangleIcon, // Added for Quality
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
  Radar,
  Sector // Added for Pie charts
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
import EmailCompose from '../components/EmailCompose/emailCompose.jsx';

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// + COMPONENT: SpecificProjectReport
// + This component is integrated into 'project-comprehensive' reports
// + when a specific project is selected, matching 'Specific Project report.jpg'
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const GAUGE_COLORS = ['#22c55e', '#9ca3af'];

const SpecificProjectReport = React.memo(({ project }) => {
  if (!project) {
    return (
      <div className="bg-white text-gray-700 p-8 rounded-lg text-center border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">No Project Selected</h2>
        <p>Please select a project from the filters to view the specific report.</p>
      </div>
    );
  }

  // Memoize all derived data
  const budgetData = React.useMemo(() => [
    { name: 'Budget', amount: project.totalProjectValue || 0, fill: '#3b82f6' },
    { name: 'Payment', amount: project.paymentReceived || 0, fill: '#22c55e' },
    { name: 'Pending', amount: project.balanceAmount || 0, fill: '#f97316' },
  ], [project.totalProjectValue, project.paymentReceived, project.balanceAmount]);

  const phaseDetails = React.useMemo(() => {
    return project.milestoneData?.milestones?.map((milestone, index) => ({
      name: milestone.name || `Milestone ${index + 1}`,
      progress: milestone.completionRate || 0
    })) || [
        { name: 'Planning', progress: project.taskCompletionRate || 0 },
        { name: 'Execution', progress: Math.min((project.taskCompletionRate || 0) * 1.2, 100) },
        { name: 'Completion', progress: Math.min((project.taskCompletionRate || 0) * 0.8, 100) },
      ];
  }, [project.milestoneData, project.taskCompletionRate]);

  const phases = React.useMemo(() => {
    const milestoneNames = project.milestoneData?.milestones?.map(m => m.name);
    return (milestoneNames && milestoneNames.length > 0) ? milestoneNames :
      ['Planning', 'Design', 'Execution', 'Completion'];
  }, [project.milestoneData]);

  const currentPhaseIndex = React.useMemo(() => {
    return project.stage?.includes('PLANNING') ? 0 :
      project.stage?.includes('PROGRESS') ? Math.floor((project.taskCompletionRate || 0) / 25) :
        project.stage?.includes('COMPLETED') ? phases.length - 1 :
          Math.floor((project.taskCompletionRate || 0) / 25);
  }, [project.stage, project.taskCompletionRate, phases.length]);

  const getPhaseClass = React.useCallback((index) => {
    if (index < currentPhaseIndex) return 'bg-blue-500 border-blue-500'; // Completed
    if (index === currentPhaseIndex) return 'bg-blue-500 border-blue-500 scale-110'; // Active
    return 'bg-gray-300 border-gray-400'; // Pending
  }, [currentPhaseIndex]);

  const gaugeData = React.useMemo(() => [
    { name: 'Completed', value: project.taskCompletionRate || 0 },
    { name: 'Remaining', value: 100 - (project.taskCompletionRate || 0) }
  ], [project.taskCompletionRate]);

  const time = React.useMemo(() => ({
    estimated: project.estimatedDuration || project.milestoneData?.totalTasks || 30,
    utilized: project.actualDuration || project.milestoneData?.completedTasks || 28
  }), [project.estimatedDuration, project.milestoneData, project.actualDuration]);

  const isOverdue = time.utilized > time.estimated;
  const overdueDays = time.utilized - time.estimated;

  return (
    <div className="bg-white text-gray-800 p-6 md:p-8 rounded-lg border border-gray-200">
      {/* Header */}
      <h2 className="text-3xl font-bold text-center border-b border-gray-300 pb-4 mb-6">
        Project Report – {project.projectName}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Phases & Completion) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Project Phase Stepper */}
          <div>
            <h3 className="text-xl font-semibold mb-6">Project Phase (Current: {project.stage})</h3>
            <div className="flex items-center">
              {phases.map((phase, index) => (
                <React.Fragment key={phase}>
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all ${getPhaseClass(index)}`} />
                    <span className="text-xs mt-2 text-gray-600">{phase}</span>
                  </div>
                  {index < phases.length - 1 && (
                    <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Task/Time/Overdue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-300 pt-8">
            <div>
              <h4 className="text-lg font-semibold mb-2">Tasks</h4>
              <p>Total: {project.totalTasks || 0}</p>
              <p className="text-green-600">Completed: {project.completedTasks || 0}</p>
              <p className="text-yellow-600">In Progress: {(project.totalTasks || 0) - (project.completedTasks || 0)}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Time (days)</h4>
              <p>– estimated: {time.estimated}</p>
              <p>– utilized: {time.utilized}</p>
            </div>
            {isOverdue && (
              <div>
                <h4 className="text-lg font-semibold mb-2 text-red-600">Overdue</h4>
                <div className="border-2 border-red-500 p-3 rounded-md text-red-600 bg-red-50">
                  Project extended +{overdueDays} days
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Completion Gauge) */}
        <div className="flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Project completion</h3>
            <div style={{ width: 180, height: 100, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gaugeData}
                    dataKey="value"
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {gaugeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GAUGE_COLORS[index % GAUGE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">
                {project.taskCompletionRate}%
              </div>
            </div>
            <p className="mt-2 text-lg">{project.taskCompletionRate}% Complete</p>
          </div>
        </div>
      </div>

      {/* Bottom Row (Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-300 mt-8 pt-8">
        {/* Project Budget Chart */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Project budget</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={budgetData} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} tickFormatter={(val) => `₹${val / 1000}k`} />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                formatter={(value) => `₹${value.toLocaleString()}`}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {budgetData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Project Phase (Task Progress) Chart */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Project Phase Progress</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart layout="vertical" data={phaseDetails} margin={{ top: 0, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6b7280' }} tickFormatter={(val) => `${val}%`} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#6b7280' }} />
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                formatter={(value) => `${value}%`}
              />
              <Bar dataKey="progress" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// + END of SpecificProjectReport Component
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

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
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('thisYear');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // State for new 'comprehensive' tabs
  const [activeComprehensiveTab, setActiveComprehensiveTab] = useState('Total Projects');

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

  const [emailCompose, setEmailCompose] = useState(false);
  const [emailapiTrigger, setEmailapiTrigger] = useState({
    status: "default",   // "default" | "pending" | "success" | "error"
    message: "no"
  });
  const [emailStatus, setEmailStatus] = useState(null); // 'sending', 'success', 'error' 
  const [emailMessage, setEmailMessage] = useState('');

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
    // Group by work category
    const scopeCounts = inventory.reduce((acc, item) => {
      const scope = item.workCategory || item.scopeOfWork || 'Unknown';
      acc[scope] = (acc[scope] || 0) + (item.totalStock || item.cumulativeQuantityAtVoomet || 0);
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
      // Calculate task completion ratio (completed/total)
      const totalTasks = project.milestoneData?.totalTasks || project.tasks?.length || 0;
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
        completedTasks: completedTasks
      };
    });

    setComprehensiveProjectData(completionData);
  };

  const processVendorPaymentChartData = (vendorPayments) => {
    const vendorTotals = vendorPayments.reduce((acc, payment) => {
      // Handle vendor as either string or object
      const vendor = typeof payment.vendor === 'string'
        ? payment.vendor
        : (payment.vendor?.vendorName || 'Unknown Vendor');
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
      if (status.includes('COMPLETED')) {
        acc.completed++;
      } else if (status.includes('PROGRESS')) {
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
    const scopes = inventoryData.map(item => item.workCategory || item.scopeOfWork).filter(Boolean);
    return [...new Set(scopes)].sort();
  };

  const getUniqueCustomers = () => {
    const customers = qualityData.map(item => item.customer).filter(Boolean);
    return [...new Set(customers)].sort();
  };

  const getUniqueVendors = () => {
    const vendors = vendorPaymentData.map(item => {
      // Handle vendor as either string or object
      if (typeof item.vendor === 'string') {
        return item.vendor;
      } else if (item.vendor?.vendorName) {
        return item.vendor.vendorName;
      }
      return null;
    }).filter(Boolean);
    return [...new Set(vendors)].sort();
  };

  // Filter functions for each report type
  const getFilteredComprehensiveProjectData = () => {
    if (!selectedProject) return comprehensiveProjectData;
    return comprehensiveProjectData.filter(item => item.projectName === selectedProject);
  };

  // Helper for comparisons - only filters by scope, ignores time period
  const getScopeFilteredInventoryData = () => {
    if (!selectedScopeOfWork) return inventoryData;
    return inventoryData.filter(item => (item.workCategory || item.scopeOfWork) === selectedScopeOfWork);
  };

  const getFilteredInventoryData = () => {
    // Return all data filtered by scope, ignoring time period for the main list/stats
    // to ensure the "Current Stock" view is always complete.
    return getScopeFilteredInventoryData();
  };

  // Process inventory data to add calculated stock fields for reports/PDF
  const getProcessedInventoryData = () => {
    const filteredData = getFilteredInventoryData();

    return filteredData.map(item => {
      // Calculate stock values from receipts and dispatches
      const receipts = item.receipts || [];
      const dispatches = item.dispatches || [];

      // Separate regular receipts from returns
      // If receiptCategory is not set or is 'buy', treat as regular receipt
      const regularReceipts = receipts.filter(r => !r.receiptCategory || r.receiptCategory === 'buy' || r.receiptCategory === 'receipt');
      const receiptReturns = receipts.filter(r => r.receiptCategory === 'return');

      // Separate dispatches by category
      const regularDispatches = dispatches.filter(d => d.dispatchCategory === 'dispatch');
      const dispatchReturns = dispatches.filter(d => d.dispatchCategory === 'return');
      const dispatchRejects = dispatches.filter(d => d.dispatchCategory === 'reject');

      // Calculate quantities
      const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
      const regularDispatchesQty = regularDispatches.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0);
      const rejectsQty = dispatchRejects.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0);
      const receiptReturnsQty = receiptReturns.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
      const dispatchReturnsQty = dispatchReturns.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0);
      const totalReturnsQty = receiptReturnsQty + dispatchReturnsQty;

      // Calculate values
      const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (parseFloat(r.totalValue) || 0), 0);
      const regularDispatchesTotal = regularDispatches.reduce((sum, d) => sum + (parseFloat(d.totalValue) || 0), 0);
      const rejectsTotal = dispatchRejects.reduce((sum, d) => sum + (parseFloat(d.totalValue) || 0), 0);
      const receiptReturnsTotal = receiptReturns.reduce((sum, r) => sum + (parseFloat(r.totalValue) || 0), 0);
      const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (parseFloat(d.totalValue) || 0), 0);
      const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;

      // Extract vendor name and category from rowData if available
      const vendorName = item.rowData?.[0]?.vendorNames
        ? (Array.isArray(item.rowData[0].vendorNames)
          ? item.rowData[0].vendorNames.join(', ')
          : item.rowData[0].vendorNames)
        : (item.customerVendorName || item.vendorName || '');

      const category = item.rowData?.[0]?.category || item.category || '';

      return {
        ...item,
        vendorName: vendorName,
        category: category,
        // Use existing values from API or default to 0
        stockAtFactory: item.stockAtFactory ?? 0,
        stockValueAtFactory: item.stockValueAtFactory ?? 0,
        stockSentToCustomer: item.stockSentToCustomer ?? 0,
        stockValueSentToCustomer: item.stockValueSentToCustomer ?? 0,
        stockReject: item.stockReject ?? item.stockRejected ?? 0,
        stockValueReject: item.stockValueReject ?? item.stockValueRejected ?? 0,
        stockReturnFromCustomer: item.stockReturnFromCustomer ?? 0,
        stockValueReturnFromCustomer: item.stockValueReturnFromCustomer ?? item.inventoryReturnFromCustomerValue ?? 0,
        totalStock: item.totalStock ?? 0,
        totalStockValue: item.totalStockValue ?? 0
      };
    });
  };

  const getFilteredQualityData = () => {
    if (!selectedCustomer) return qualityData;
    return qualityData.filter(item => item.customer === selectedCustomer);
  };

  const getFilteredVendorPaymentData = () => {
    if (!selectedVendor) return vendorPaymentData;
    return vendorPaymentData.filter(item => {
      // Handle vendor as either string or object
      const vendorName = typeof item.vendor === 'string'
        ? item.vendor
        : (item.vendor?.vendorName || '');
      return vendorName === selectedVendor;
    });
  };

  // Process chart data from filtered datasets
  const processFilteredInventoryChartData = () => {
    const filteredData = getFilteredInventoryData();
    const scopeData = filteredData.reduce((acc, item) => {
      const scope = item.workCategory || item.scopeOfWork || 'Unknown';
      acc[scope] = (acc[scope] || 0) + (item.totalStock || item.cumulativeQuantityAtVoomet || 0);
      return acc;
    }, {});

    return Object.entries(scopeData)
      .map(([name, value]) => ({ name: name.replace('_', ' ').toUpperCase(), value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
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
      // Handle vendor as either string or object
      const vendor = typeof item.vendor === 'string'
        ? item.vendor
        : (item.vendor?.vendorName || 'Unknown');
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

  // Get top inventory items by quantity with dispatched data
  const getInventoryQuantityDispatchedData = () => {
    const filteredData = getFilteredInventoryData();

    return filteredData
      .map(item => {
        // Use existing stock data from API
        // Quantity = Current Stock = stockAtFactory
        const currentStock = item.stockAtFactory || 0;

        // Quantity dispatched = stockSentToCustomer
        const dispatched = item.stockSentToCustomer || 0;

        return {
          name: typeof item.partName === 'string' ? item.partName.substring(0, 15) : "Unknown",
          Quantity: currentStock,
          'Quantity dispatched': dispatched,
          partPrice: item.partPrice || 0
        };
      })
      .filter(item => item.Quantity > 0 || item['Quantity dispatched'] > 0) // Only show items with activity
      .sort((a, b) => b.Quantity - a.Quantity) // Sort by Quantity (Current Stock)
      .slice(0, 10); // Top 10 items
  };

  // Get vendor payment trend data by week/month
  const getVendorPaymentTrendData = () => {
    const filteredData = getFilteredVendorPaymentData();
    const period = getDateRangeForPeriod(selectedTimePeriod);

    // Group payments by week/month
    const paymentTrends = {};

    filteredData.forEach(payment => {
      payment.invoices?.forEach(invoice => {
        invoice.payments?.forEach(paymentRecord => {
          const paymentDate = new Date(paymentRecord.paymentDate || paymentRecord.date || invoice.invoiceDate);

          // Only include payments within the selected time period
          if (paymentDate >= period.start && paymentDate <= period.end) {
            let periodKey;

            if (selectedTimePeriod === 'thisWeek' || selectedTimePeriod === 'lastWeek') {
              // Group by day for weekly view
              periodKey = paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (selectedTimePeriod === 'thisMonth' || selectedTimePeriod === 'lastMonth') {
              // Group by week for monthly view
              const weekNumber = Math.ceil(paymentDate.getDate() / 7);
              periodKey = `Week ${weekNumber}`;
            } else {
              // Group by month for yearly view
              periodKey = paymentDate.toLocaleDateString('en-US', { month: 'short' });
            }

            if (!paymentTrends[periodKey]) {
              paymentTrends[periodKey] = { name: periodKey, Paid: 0, Pending: 0 };
            }

            // Add to paid amount
            paymentTrends[periodKey].Paid += paymentRecord.amount || 0;
          }
        });

        // Add pending amount from invoice value minus payments
        const invoiceDate = new Date(invoice.invoiceDate);
        if (invoiceDate >= period.start && invoiceDate <= period.end) {
          let periodKey;

          if (selectedTimePeriod === 'thisWeek' || selectedTimePeriod === 'lastWeek') {
            periodKey = invoiceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (selectedTimePeriod === 'thisMonth' || selectedTimePeriod === 'lastMonth') {
            const weekNumber = Math.ceil(invoiceDate.getDate() / 7);
            periodKey = `Week ${weekNumber}`;
          } else {
            periodKey = invoiceDate.toLocaleDateString('en-US', { month: 'short' });
          }

          if (!paymentTrends[periodKey]) {
            paymentTrends[periodKey] = { name: periodKey, Paid: 0, Pending: 0 };
          }

          const totalPayments = invoice.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          const pendingAmount = (invoice.invoiceValue || 0) - totalPayments;

          if (pendingAmount > 0) {
            paymentTrends[periodKey].Pending += pendingAmount;
          }
        }
      });
    });

    // Convert to array and sort by date/name
    return Object.values(paymentTrends).sort((a, b) => {
      if (a.name.includes('Week')) {
        return parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]);
      }
      return a.name.localeCompare(b.name);
    });
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

  // +++ NEW HELPER FUNCTIONS for new charts +++
  const getCustomerProjectCounts = () => {
    const filteredData = getFilteredComprehensiveProjectData();
    const customerCounts = filteredData.reduce((acc, project) => {
      const customer = project.customerName || 'Unknown';
      acc[customer] = (acc[customer] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(customerCounts)
      .map(([customer, projects]) => ({ customer, projects }))
      .sort((a, b) => b.projects - a.projects)
      .slice(0, 5); // Get top 5
  };

  const getQualityIssuesByMonth = () => {
    const filteredData = getFilteredQualityData();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lineData = months.map(monthName => ({ name: monthName, Issues: 0 }));

    filteredData.forEach(issue => {
      if (issue.createdAt) {
        const issueDate = new Date(issue.createdAt);
        // Only include issues from the selected time period
        const period = getDateRangeForPeriod(selectedTimePeriod);
        if (issueDate >= period.start && issueDate <= period.end) {
          const monthIndex = issueDate.getMonth();
          lineData[monthIndex].Issues++;
        }
      }
    });
    // Filter out months with 0 issues if it's not a full year view
    if (selectedTimePeriod !== 'thisYear' && selectedTimePeriod !== 'lastYear') {
      return lineData.filter(d => d.Issues > 0);
    }
    return lineData;
  };

  const getAverageIssuesPerMonth = () => {
    const filteredData = getFilteredQualityData();
    const issuesByMonth = filteredData.reduce((acc, issue) => {
      if (issue.createdAt) {
        const issueDate = new Date(issue.createdAt);
        const period = getDateRangeForPeriod(selectedTimePeriod);
        if (issueDate >= period.start && issueDate <= period.end) {
          const monthYear = `${issueDate.getFullYear()}-${issueDate.getMonth()}`;
          acc[monthYear] = (acc[monthYear] || 0) + 1;
        }
      }
      return acc;
    }, {});

    const monthsWithIssues = Object.keys(issuesByMonth).length;
    const totalIssues = Object.values(issuesByMonth).reduce((a, b) => a + b, 0);

    return monthsWithIssues > 0 ? Math.round(totalIssues / monthsWithIssues) : 0;
  };
  // +++ END NEW HELPER FUNCTIONS +++

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Time period helper functions
  const getDateRangeForPeriod = (period) => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);

    switch (period) {
      case 'thisYear':
        return { start: startOfYear, end: now };
      case 'lastYear':
        return { start: startOfLastYear, end: endOfLastYear };
      case 'last3Months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now };
      case 'last6Months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: now };
      default:
        return { start: startOfYear, end: now };
    }
  };

  const calculatePercentageChange = (currentValue, previousValue) => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100 * 100) / 100;
  };

  const getInventoryValueChange = () => {
    const currentPeriod = getDateRangeForPeriod(selectedTimePeriod);
    const previousPeriod = getDateRangeForPeriod(selectedTimePeriod === 'thisYear' ? 'lastYear' : 'last3Months');

    const currentValue = getScopeFilteredInventoryData()
      .filter(item => {
        const itemDate = new Date(item.createdAt || item.updatedAt || Date.now());
        return itemDate >= currentPeriod.start && itemDate <= currentPeriod.end;
      })
      .reduce((sum, item) => sum + ((item.partPrice || 0) * (item.cumulativeQuantityAtVoomet || 0)), 0);

    const previousValue = getScopeFilteredInventoryData()
      .filter(item => {
        const itemDate = new Date(item.createdAt || item.updatedAt || Date.now());
        return itemDate >= previousPeriod.start && itemDate <= previousPeriod.end;
      })
      .reduce((sum, item) => sum + ((item.partPrice || 0) * (item.cumulativeQuantityAtVoomet || 0)), 0);

    return calculatePercentageChange(currentValue, previousValue);
  };

  const getProjectValueChange = () => {
    const currentPeriod = getDateRangeForPeriod(selectedTimePeriod);
    const previousPeriod = getDateRangeForPeriod(selectedTimePeriod === 'thisYear' ? 'lastYear' : 'last3Months');

    const currentValue = getFilteredComprehensiveProjectData()
      .filter(project => {
        const projectDate = new Date(project.createdAt || project.updatedAt || Date.now());
        return projectDate >= currentPeriod.start && projectDate <= currentPeriod.end;
      })
      .reduce((sum, project) => sum + (project.totalProjectValue || 0), 0);

    const previousValue = getFilteredComprehensiveProjectData()
      .filter(project => {
        const projectDate = new Date(project.createdAt || project.updatedAt || Date.now());
        return projectDate >= previousPeriod.start && projectDate <= previousPeriod.end;
      })
      .reduce((sum, project) => sum + (project.totalProjectValue || 0), 0);

    return calculatePercentageChange(currentValue, previousValue);
  };

  const getQualityIssuesChange = () => {
    const currentPeriod = getDateRangeForPeriod(selectedTimePeriod);
    const previousPeriod = getDateRangeForPeriod(selectedTimePeriod === 'thisYear' ? 'lastYear' : 'last3Months');

    const currentCount = getFilteredQualityData()
      .filter(issue => {
        const issueDate = new Date(issue.createdAt || issue.updatedAt || Date.now());
        return issueDate >= currentPeriod.start && issueDate <= currentPeriod.end;
      }).length;

    const previousCount = getFilteredQualityData()
      .filter(issue => {
        const issueDate = new Date(issue.createdAt || issue.updatedAt || Date.now());
        return issueDate >= previousPeriod.start && issueDate <= previousPeriod.end;
      }).length;

    return calculatePercentageChange(currentCount, previousCount);
  };

  const getVendorPaymentChange = () => {
    const currentPeriod = getDateRangeForPeriod(selectedTimePeriod);
    const previousPeriod = getDateRangeForPeriod(selectedTimePeriod === 'thisYear' ? 'lastYear' : 'last3Months');

    const currentValue = getFilteredVendorPaymentData()
      .filter(payment => {
        const paymentDate = new Date(payment.createdAt || payment.updatedAt || Date.now());
        return paymentDate >= currentPeriod.start && paymentDate <= currentPeriod.end;
      })
      .reduce((sum, payment) => sum + (payment.totalPayments || 0), 0);

    const previousValue = getFilteredVendorPaymentData()
      .filter(payment => {
        const paymentDate = new Date(payment.createdAt || payment.updatedAt || Date.now());
        return paymentDate >= previousPeriod.start && paymentDate <= previousPeriod.end;
      })
      .reduce((sum, payment) => sum + (payment.totalPayments || 0), 0);

    return calculatePercentageChange(currentValue, previousValue);
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
                <p className="text-sm font-medium text-gray-500">Work Category</p>
                <p className="text-sm text-gray-900">{(data.workCategory || data.scopeOfWork)?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Item Name</p>
                <p className="text-sm text-gray-900">{data.partName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-sm text-gray-900">{data.rowData?.[0]?.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Vendor Name</p>
                <p className="text-sm text-gray-900">{data.rowData?.[0]?.vendorNames?.join(', ') || data.customerVendorName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Re-order level</p>
                <p className="text-sm text-gray-900">{data.reOrderLevel || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock at Factory</p>
                <p className="text-sm text-gray-900">{data.stockAtFactory || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock value at Factory</p>
                <p className="text-sm text-gray-900">₹{(data.stockValueAtFactory || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock sent to Customer</p>
                <p className="text-sm text-gray-900">{data.stockSentToCustomer || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock value sent to Customer</p>
                <p className="text-sm text-gray-900">₹{(data.stockValueSentToCustomer || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock return from Customer</p>
                <p className="text-sm text-gray-900">{data.stockReturnFromCustomer || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock value return from Customer</p>
                <p className="text-sm text-gray-900">₹{(data.stockValueReturnFromCustomer || data.inventoryReturnFromCustomerValue || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock Return to Vendor</p>
                <p className="text-sm text-gray-900">{data.stockReturnToVendor || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock value Return to Vendor</p>
                <p className="text-sm text-gray-900">₹{(data.stockValueReturnToVendor || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock Reject</p>
                <p className="text-sm text-gray-900">{data.stockReject || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Stock value Reject</p>
                <p className="text-sm text-gray-900">₹{(data.stockValueReject || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Stock</p>
                <p className="text-sm text-gray-900">{data.totalStock || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Stock value</p>
                <p className="text-sm text-gray-900">₹{(data.totalStockValue || 0).toLocaleString()}</p>
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
                <p className="text-sm font-medium text-gray-500">Client Name</p>
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
                <p className="text-sm text-gray-900">{typeof data.vendor === 'string' ? data.vendor : (data.vendor?.vendorName || 'N/A')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">GST Number</p>
                <p className="text-sm text-gray-900">{typeof data.vendor === 'string' ? 'N/A' : (data.vendor?.gstNumber || 'N/A')}</p>
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
        import('../components/Reports/BackgroundReportPDFGenerator.js')
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
  const closeModel = () => {
    setEmailCompose(false)
  }

  // const onSend = async (emailComposeData) => {
  //   try {
  //     setLoading(true);

  //     // Get the current report data
  //     const currentData = activeReportConfig.data;
  //     const currentTitle = activeReportConfig.title;

  //     // Create a hidden container div for the React component
  //     const container = document.createElement('div');
  //     container.style.position = 'fixed';
  //     container.style.left = '-9999px';
  //     container.style.top = '-9999px';
  //     document.body.appendChild(container);

  //     // Import React and ReactDOM for dynamic rendering
  //     const [React, ReactDOM, { default: BackgroundReportPDFGenerator }] = await Promise.all([
  //       import('react'),
  //       import('react-dom/client'),
  //       import('../components/Reports/BackgroundReportPDFGenerator.js')
  //     ]);

  //     const root = ReactDOM.createRoot(container);

  //     return new Promise((resolve, reject) => {
  //       const handleComplete = async (pdfBlob, generatedFilename) => {
  //         try {
  //           // Convert blob to base64 for sending via API
  //           const reader = new FileReader();
  //           reader.onloadend = async () => {
  //             const base64PDF = reader.result.split(',')[1];

  //             // Check file size (base64 is ~33% larger than binary)
  //             const fileSizeInMB = (base64PDF.length * 0.75) / (1024 * 1024);
  //             console.log(`PDF file size: ${fileSizeInMB.toFixed(2)} MB`);

  //             let emailData = {
  //               // email: emailAddress,
  //               email: emailComposeData.to,
  //               cc: emailComposeData.cc,
  //               bcc: emailComposeData.bcc,
  //               body: emailComposeData.body,
  //               reportTitle: undefined,
  //               reportData: currentData,
  //               reportType: activeReport,
  //               pdfFilename: generatedFilename
  //             };

  //             // Only include PDF data if file size is reasonable
  //             if (fileSizeInMB <= 50) { // 10MB limit
  //               emailData.pdfData = base64PDF;
  //             } else {
  //               console.warn('PDF file too large, will generate on backend');
  //               alert('PDF file is large, generating on server for email...');
  //             }

  //             // Send the email with or without PDF data
  //             await reportsAPI.sendEmail(emailData);

  //             alert('Report sent successfully via email!');
  //             setEmailAddress('');

  //             // Clean up
  //             root.unmount();
  //             document.body.removeChild(container);
  //             setLoading(false);
  //             setEmailCompose(false);
  //             resolve();
  //           };
  //           reader.onerror = () => {
  //             throw new Error('Failed to read PDF file');
  //           };
  //           reader.readAsDataURL(pdfBlob);
  //         } catch (error) {
  //           console.error('Error sending email:', error);
  //           alert(`Failed to send email: ${error.response?.data?.message || error.message}`);

  //           // Clean up
  //           root.unmount();
  //           document.body.removeChild(container);
  //           setLoading(false);
  //           reject(error);
  //         }
  //       };

  //       const handleError = (error) => {
  //         console.error('Error generating PDF for email:', error);
  //         alert(`Failed to generate PDF for email: ${error.message}`);

  //         // Clean up
  //         root.unmount();
  //         document.body.removeChild(container);
  //         setLoading(false);
  //         reject(error);
  //       };

  //       // Render the BackgroundReportPDFGenerator component
  //       root.render(
  //         React.createElement(BackgroundReportPDFGenerator, {
  //           reportData: currentData,
  //           reportType: activeReport,
  //           reportTitle: currentTitle,
  //           onComplete: handleComplete,
  //           onError: handleError
  //         })
  //       );
  //     });
  //   } catch (error) {
  //     console.error('Error in sendEmail:', error);
  //     alert(`Failed to send email: ${error.response?.data?.message || error.message}`);
  //     setLoading(false);
  //   }
  // };


  const onSend = async (emailComposeData) => {
    try {
      setEmailapiTrigger({
        status: "pending",
        message: "Sending email..."
      });

      // Build FormData
      const formData = new FormData();

      formData.append("from", emailComposeData.from || "");
      emailComposeData.to.forEach(v => formData.append("to", v));
      emailComposeData.cc.forEach(v => formData.append("cc", v));
      emailComposeData.bcc.forEach(v => formData.append("bcc", v));
      formData.append("subject", emailComposeData.subject || "");
      formData.append("body", emailComposeData.body || "");

      // Attach files
      if (emailComposeData.attachments && emailComposeData.attachments.length > 0) {
        emailComposeData.attachments.forEach(file => {
          formData.append("attachments", file);
        });
      }

      // Call backend email API
      await reportsAPI.sendEmail(formData);

      // Success
      setEmailapiTrigger({
        status: "success",
        message: `Email successfully sent to ${emailComposeData.to}`
      });
      closeModel();

      setEmailStatus('success')
      setEmailMessage(`Email successfully sent to ${emailComposeData.to}`)
      // Clear message after delay
      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
        setEmailStatus(null)
        setEmailMessage(``)
      }, 3000);

    } catch (error) {
      setEmailapiTrigger({
        status: "error",
        message: `Failed to send email: ${error.message}`
      });

      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
      }, 5000);

    } finally {
      setEmailapiTrigger({
        status: "default",
        message: ""
      });
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
    setEmailCompose(true)
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
  const reportTypes = React.useMemo(() => [
    { id: 'project-comprehensive', name: 'Comprehensive Project Reports', icon: ClipboardDocumentListIcon },
    { id: 'inventory', name: 'Inventory Reports', icon: CubeIcon },
    { id: 'quality', name: 'Quality Reports', icon: ShieldCheckIcon },
    { id: 'vendor', name: 'Vendor Payment Reports', icon: BuildingStorefrontIcon }
  ], []);

  // Comprehensive Project Report Configuration
  const comprehensiveProjectReportConfig = React.useMemo(() => ({
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
  }), [comprehensiveProjectData]);

  // Specific Project Report Configuration (for PDF/CSV export)
  const specificProjectReportConfig = React.useMemo(() => ({
    title: `Specific Project Report - ${selectedProject}`,
    // We only pass the single selected project
    data: getFilteredComprehensiveProjectData().length === 1 ? getFilteredComprehensiveProjectData() : [],
    columns: [
      { header: 'Customer Name', accessor: 'customerName' },
      { header: 'Project Name', accessor: 'projectName' },
      { header: 'Stage', accessor: row => row.stage?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Total Value (₹)', accessor: row => `₹${row.totalProjectValue?.toLocaleString() || '0'}` },
      { header: 'Total Tasks', accessor: row => row.totalTasks || 0 },
      { header: 'Finished Tasks', accessor: row => row.completedTasks || 0 },
      { header: 'Task Completion', accessor: row => `${row.taskCompletionRate || 0}%` },
      { header: 'Payment Received (₹)', accessor: row => `₹${row.paymentReceived?.toLocaleString() || '0'}` },
      { header: 'Balance (₹)', accessor: row => `₹${row.balanceAmount?.toLocaleString() || '0'}` },
    ],
    filename: `specific-project-${selectedProject.replace(/\s+/g, '-')}.csv`
  }), [selectedProject, comprehensiveProjectData]);

  // Inventory Report Configuration
  const inventoryReportConfig = React.useMemo(() => ({
    title: 'Inventory Reports',
    data: inventoryData,
    columns: [
      { header: 'Work Category', accessor: row => (row.workCategory || row.scopeOfWork)?.replace('_', ' ').toUpperCase() || 'N/A' },
      { header: 'Item Name', accessor: 'partName' },
      { header: 'Category', accessor: row => row.rowData?.[0]?.category || 'N/A' },
      { header: 'Vendor Name', accessor: row => row.rowData?.[0]?.vendorNames?.join(', ') || row.customerVendorName || 'N/A' },
      { header: 'Re-order level', accessor: row => row.reOrderLevel || 0 },
      { header: 'Stock at Factory', accessor: row => row.stockAtFactory || 0 },
      { header: 'Stock value at Factory', accessor: row => `₹${(row.stockValueAtFactory || 0).toLocaleString()}` },
      { header: 'Stock sent to Customer', accessor: row => row.stockSentToCustomer || 0 },
      { header: 'Stock value sent to Customer', accessor: row => `₹${(row.stockValueSentToCustomer || 0).toLocaleString()}` },
      { header: 'Stock return from Customer', accessor: row => row.stockReturnFromCustomer || 0 },
      { header: 'Stock value return from Customer', accessor: row => `₹${(row.stockValueReturnFromCustomer || row.inventoryReturnFromCustomerValue || 0).toLocaleString()}` },
      { header: 'Stock Reject', accessor: row => row.stockReject || 0 },
      { header: 'Stock value Reject', accessor: row => `₹${(row.stockValueReject || 0).toLocaleString()}` },
      { header: 'Total Stock', accessor: row => row.totalStock || 0 },
      { header: 'Total Stock value', accessor: row => `₹${(row.totalStockValue || 0).toLocaleString()}` },
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
  }), [inventoryData]);

  // Quality Report Configuration
  const qualityReportConfig = React.useMemo(() => ({
    title: 'Quality Reports',
    data: qualityData,
    columns: [
      { header: 'Client Name', accessor: 'customer' },
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
  }), [qualityData]);

  // Vendor Payment Report Configuration
  const vendorPaymentReportConfig = React.useMemo(() => ({
    title: 'Vendor Payment Reports',
    data: vendorPaymentData,
    columns: [
      { header: 'Vendor', accessor: (row) => typeof row.vendor === 'string' ? row.vendor : (row.vendor?.vendorName || 'Unknown') },
      { header: 'GST Number', accessor: (row) => typeof row.vendor === 'string' ? 'N/A' : (row.vendor?.gstNumber || 'N/A') },
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
  }), [vendorPaymentData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

  const activeReportConfig = React.useMemo(() => {
    switch (activeReport) {
      case 'project-comprehensive':
        return {
          ...comprehensiveProjectReportConfig,
          data: getFilteredComprehensiveProjectData()
        };
      case 'inventory':
        return {
          ...inventoryReportConfig,
          data: getProcessedInventoryData() // Use processed data with calculated stock fields
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
  }, [activeReport, comprehensiveProjectReportConfig, inventoryReportConfig, qualityReportConfig, vendorPaymentReportConfig,
    comprehensiveProjectData, inventoryData, qualityData, vendorPaymentData,
    selectedProject, selectedScopeOfWork, selectedCustomer, selectedVendor]);

  // Get current report name for display
  const getCurrentReportName = () => {
    const report = reportTypes.find(r => r.id === activeReport);
    return report ? report.name : 'Select Report Type';
  };

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


  const handleDownloadPdfForEmailCompose = async (data, onPdfGenerated, setPreviewLoading) => {
    if (!data || data.length === 0) return;
    try {
      setPreviewLoading(true);
      const reportData = {
        reportType: activeReport,
        title: activeReportConfig.title,
        data: data,
        columns: activeReportConfig.columns,
        generatedAt: new Date().toISOString()
      };
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      const [React, ReactDOM, { default: BackgroundReportPDFGenerator }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Reports/BackgroundReportPDFGenerator.js')
      ]);

      const root = ReactDOM.createRoot(container);

      const handleComplete = (pdfBlob, generatedFilename) => {
        if (onPdfGenerated) {
          onPdfGenerated({
            file: new File([pdfBlob], generatedFilename, { type: "application/pdf" }),
            url: URL.createObjectURL(pdfBlob),
            name: generatedFilename
          });
        }

        root.unmount();
        document.body.removeChild(container);
        setPreviewLoading(false);//complete
      };

      const handleError = (error) => {
        root.unmount();
        document.body.removeChild(container);
        setPreviewLoading(false);//error
      };

      root.render(
        React.createElement(BackgroundReportPDFGenerator, {
          reportData: reportData.data,
          reportType: reportData.reportType,
          reportTitle: reportData.title,
          onComplete: handleComplete,
          onError: handleError
        })
      );
    } catch (error) {
      setPreviewLoading(false);
      console.error('Error loading PDF generator for mail compose:', error);
    }
  };


  return (
    <div className="p-4 sm:p-6 bg-white">
      {emailStatus && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${emailStatus === 'sending' ? 'bg-blue-50 border-blue-200' :
          emailStatus === 'success' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          } border rounded-lg shadow-lg p-4 transition-all duration-300 transform translate-x-0`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {emailStatus === 'sending' && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              )}
              {emailStatus === 'success' && (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
              {emailStatus === 'error' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${emailStatus === 'sending' ? 'text-blue-800' :
                emailStatus === 'success' ? 'text-green-800' :
                  'text-red-800'
                }`}>
                {emailStatus === 'sending' ? 'Sending Email...' :
                  emailStatus === 'success' ? 'Email Sent!' :
                    'Failed to Send Email'}
              </p>
              <p className={`text-sm ${emailStatus === 'sending' ? 'text-blue-700' :
                emailStatus === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                {emailMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Combined Report Type Selection and Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
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
                        className={`w-full text-left px-4 py-2 flex items-center hover:bg-gray-100 ${activeReport === report.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          }`}
                        onClick={() => {
                          setActiveReport(report.id);
                          setShowReportDropdown(false);
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
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${selectedProject ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
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
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${selectedProject === project ? 'bg-blue-50' : 'text-gray-900'}`}
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
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${selectedScopeOfWork ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
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
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${selectedCustomer ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
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
                    className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${selectedVendor ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-900'
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
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
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
                  className={`w-full px-4 py-2.5 rounded-md border focus:outline-none focus:ring-2 focus:border-transparent text-sm ${emailAddress && !isValidEmail(emailAddress)
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
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
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
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Visual Analytics: {getCurrentReportName()}</h2>
          {hasActiveFilters && (
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Filtered View
              </span>
              <span className="text-sm text-gray-600">
                Showing {activeReportConfig.data.length} of {getUnfilteredDataCount()} records
              </span>
            </div>
          )}
        </div>

        {/* == 1. Comprehensive Project Charts (Image: Comprehensive Project visuals(1).jpg) == */}
        {activeReport === 'project-comprehensive' && !selectedProject && (
          <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">


            {/* Charts Grid (2x2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* 1. Project Progress (Bar) */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Progress (% Completion)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFilteredComprehensiveProjectData().slice(0, 5)} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="projectName"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => value.substring(0, 8)}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#6b7280' }} unit="%" />
                    <Tooltip
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                      formatter={(value) => [`${value}%`, 'Completion']}
                    />
                    <Bar dataKey="taskCompletionRate" name="Progress" fill="#34d399" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 2. Financial Overview (Grouped Bar) */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Financial overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFilteredComprehensiveProjectData().slice(0, 5)} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="projectName"
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => value.substring(0, 8)}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#6b7280' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Bar dataKey="totalProjectValue" name="Budget" fill="#8b5cf6" />
                    <Bar dataKey="balanceAmount" name="Pending" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 3. Project Status (Donut) */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Open', value: jobsStatus.open },
                        { name: 'In progress', value: jobsStatus.inProgress },
                        { name: 'Complete', value: jobsStatus.completed }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      fill="#8884d8"
                    >
                      <Cell fill="#34d399" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#f97316" />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 4. Customers with urgent Projects (Horizontal Bar) */}
              <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-3 lg:mb-4">Projects by Customer</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart layout="vertical" data={getCustomerProjectCounts()} margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280' }} allowDecimals={false} />
                    <YAxis dataKey="customer" type="category" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                    />
                    <Bar dataKey="projects" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>
        )}

        {/* == 2. Specific Project Report (Integrated into Comprehensive Project Reports) == */}
        {activeReport === 'project-comprehensive' && selectedProject && (
          <div>
            <SpecificProjectReport project={getFilteredComprehensiveProjectData()[0]} />
          </div>
        )}

        {/* == 3. Vendor Payment Charts (Image: Vendor Payment dashboard.jpg) == */}
        {activeReport === 'vendor' && (
          <div className="bg-white text-gray-800 p-6 rounded-lg space-y-6 border border-gray-200">
            <h2 className="text-2xl font-semibold mb-2">Vendor Payment</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                <p className="text-sm text-cyan-700">Total Invoice Generated</p>
                <p className="text-3xl font-bold text-cyan-900">{getFilteredVendorPaymentData().length}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700">No. of Invoice Pending</p>
                <p className="text-3xl font-bold text-orange-900">{getFilteredVendorPaymentData().filter(v => v.status === 'Pending' || v.status === 'Partial').length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">No. of Invoice Submitted</p>
                <p className="text-3xl font-bold text-green-900">{getFilteredVendorPaymentData().filter(v => v.status === 'Paid').length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">Total Amount Pending</p>
                <p className="text-3xl font-bold text-gray-900">₹{getFilteredVendorPaymentData().reduce((sum, v) => sum + (v.balanceAmount || 0), 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">Total Invoice Value</p>
                <p className="text-3xl font-bold text-gray-900">₹{getFilteredVendorPaymentData().reduce((sum, v) => sum + (v.totalInvoiceRaised || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">Total Amount Received</p>
                <p className="text-3xl font-bold text-gray-900">₹{getFilteredVendorPaymentData().reduce((sum, v) => sum + (v.totalPayments || 0), 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoice Status Pie Chart */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Invoice Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        // Assuming 'Pending' and 'Partial' are "Pending"
                        { name: 'Pending', value: getFilteredVendorPaymentData().filter(v => v.status === 'Pending' || v.status === 'Partial').length },
                        // Assuming 'Paid' is "Approved"
                        { name: 'Approved', value: getFilteredVendorPaymentData().filter(v => v.status === 'Paid').length },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index, percent }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                          <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }} />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Trend Line Chart */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Payment Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getVendorPaymentTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                    <YAxis tick={{ fill: '#6b7280' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }}
                      formatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Line type="monotone" dataKey="Paid" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="Pending" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* == 4. Inventory Charts (Image: Inventory Dashboard.jpg) == */}
        {activeReport === 'inventory' && (
          <div className="bg-white text-gray-800 p-6 rounded-lg space-y-6 border border-gray-200">
            <h2 className="text-2xl font-semibold mb-2">Inventory Management dashboard</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Total inventory value</p>
                <p className="text-2xl font-bold text-gray-900">₹{getFilteredInventoryData().reduce((sum, item) => sum + (item.totalStockValue || (item.partPrice || 0) * (item.cumulativeQuantityAtVoomet || 0)), 0).toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Total work categories</p>
                <p className="text-2xl font-bold text-gray-900">{getUniqueScopeOfWork().length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Total Products/Parts</p>
                <p className="text-2xl font-bold text-gray-900">{getFilteredInventoryData().length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-gray-900">{getFilteredInventoryData().reduce((sum, item) => sum + (item.totalStock || item.cumulativeQuantityAtVoomet || 0), 0)}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-lg border border-gray-300">
              {/* Product/part name Bar Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Product / Item Name (Top 10 by Quantity)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getInventoryQuantityDispatchedData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                    <YAxis tick={{ fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }} />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Bar dataKey="Quantity" fill="#8884d8" name="Current Stock" />
                    <Bar dataKey="Quantity dispatched" fill="#82ca9d" name="Dispatched" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Product Dispatched (%) Pie Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Distribution (%) (Top 5 Work Categories)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  {processFilteredInventoryChartData().slice(0, 5).length > 0 ? (
                    <PieChart>
                      <Pie
                        data={processFilteredInventoryChartData().slice(0, 5)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        labelLine={false}
                        label={({ name, percent }) => `${name.substring(0, 8)} ${(percent * 100).toFixed(0)}%`}
                      >
                        {processFilteredInventoryChartData().slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No data available
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* == 5. Quality Charts (Image: Quality Manangement.jpg) == */}
        {activeReport === 'quality' && (
          <div className="bg-white p-6 rounded-lg space-y-6 border border-gray-200">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Total Issues</p>
                <p className="text-4xl font-bold text-gray-900">{getFilteredQualityData().length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Issues Open</p>
                  <p className="text-4xl font-bold text-gray-900">{getFilteredQualityData().filter(q => q.status === 'open').length}</p>
                </div>
                <ExclamationCircleIcon className="h-10 w-10 text-yellow-500" />
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Issues Closed</p>
                  <p className="text-4xl font-bold text-gray-900">{getFilteredQualityData().filter(q => q.status !== 'open').length}</p>
                </div>
                <CheckCircleIcon className="h-10 w-10 text-green-500" />
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-300">
                <p className="text-sm text-gray-600">Average Issues Raised per Month</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-bold text-gray-900">{getAverageIssuesPerMonth()}</p>
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* All Reported Issues Bar Chart */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">All Reported Issues (by Category)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getQualityTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6b7280' }} label={{ value: 'NO. of Issues', angle: -90, position: 'insideLeft', fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }} />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Bar dataKey="open" stackId="a" name="Open" fill="#3b82f6" />
                    <Bar dataKey="resolved" stackId="a" name="Resolved" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Issues Created per Month Line Chart */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Issues Created per Month</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getQualityIssuesByMonth()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                    <YAxis tick={{ fill: '#6b7280' }} label={{ value: 'NO. of Issues', angle: -90, position: 'insideLeft', fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db', color: '#374151' }} />
                    <Line type="monotone" dataKey="Issues" stroke="#22c55e" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for no data */}
        {activeReportConfig.data.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No data available for the selected report or filters</p>
          </div>
        )}
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
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

      {emailCompose &&
        <EmailCompose
          emailAddress={"support@caldimengg.in"}
          modelTitle={"Send Report"}
          onSend={onSend}
          closeModel={closeModel}
          tomail={[emailAddress]}
          handlePreview={(handlePdfAttach, setPreviewLoading) => handleDownloadPdfForEmailCompose(activeReportConfig.data, handlePdfAttach, setPreviewLoading)}
          emailapiTrigger={emailapiTrigger}
          emailMeta={{
            title: activeReportConfig.title,
            reportType: activeReport,
            data: activeReportConfig.data,
            defaultSubject: `${activeReportConfig.title}`
          }}
        />
      }
    </div>
  );
};

export default Reports;