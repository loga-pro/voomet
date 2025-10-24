import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  CurrencyRupeeIcon,
  WrenchIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  TruckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { projectsAPI, customersAPI, vendorsAPI, dashboardAPI } from '../services/api';
import ProjectDetailsModal from '../components/Modals/ProjectDetailsModal';

const Dashboard = () => {
  const [kpis, setKpis] = useState({
    projectKPIs: {
      rfq: 0,
      boq: 0,
      awarded: 0,
      underExecution: 0,
      completed: 0,
      postImplementation: 0
    },
    financialKPIs: {
      totalProjects: 0,
      totalProjectValue: 0,
      totalPaymentsReceived: 0,
      totalPaymentsPending: 0
    },
    vendorPaymentKPIs: {
      totalVendors: 0,
      totalVendorPayments: 0,
      totalVendorInvoiceRaised: 0,
      totalVendorPaymentsPending: 0,
      paymentCompleted: 0,
      paymentPending: 0,
      paymentOverdue: 0
    },
    inventoryKPIs: {
      totalPartsValueAtShopFloor: 0,
      totalPartsValueAtSite: 0,
      totalInventoryValue: 0,
      itemsAtShopFloor: 0,
      itemsAtSite: 0,
      lowStockItems: 0
    },
    qualityKPIs: {
      rectify: 0,
      replace: 0,
      openIssues: 0,
      closedIssues: 0,
      criticalIssues: 0,
      totalIssues: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState(null);
  const [selectedStageTitle, setSelectedStageTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, customersRes, vendorsRes, kpisRes] = await Promise.all([
          projectsAPI.getAll(),
          customersAPI.getAll(),
          vendorsAPI.getAll(),
          dashboardAPI.getKPIs()
        ]);

        setKpis(kpisRes.data);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStageClick = (stage, title) => {
    setSelectedStage(stage);
    setSelectedStageTitle(title);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
    setSelectedStageTitle('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Enhanced Project KPI cards with gradients and history
  const projectKPIs = [
    { 
      id: 'rfq',
      title: 'RFQ', 
      value: kpis.projectKPIs.rfq, 
      icon: ClipboardDocumentListIcon, 
      gradient: 'from-blue-500 to-blue-600',
      description: 'Request for Quotation'
    },
    { 
      id: 'boq',
      title: 'BOQ', 
      value: kpis.projectKPIs.boq, 
      icon: WrenchIcon, 
      gradient: 'from-indigo-500 to-indigo-600',
      description: 'Bill of Quantity'
    },
    { 
      id: 'awarded',
      title: 'Awarded', 
      value: kpis.projectKPIs.awarded, 
      icon: CheckCircleIcon, 
      gradient: 'from-green-500 to-green-600',
      description: 'Projects Awarded'
    },
    { 
      id: 'under-execution',
      title: 'Under Execution', 
      value: kpis.projectKPIs.underExecution, 
      icon: ChartBarIcon, 
      gradient: 'from-yellow-500 to-yellow-600',
      description: 'Active Projects'
    },
    { 
      id: 'completed',
      title: 'Completed', 
      value: kpis.projectKPIs.completed, 
      icon: CheckCircleIcon, 
      gradient: 'from-purple-500 to-purple-600',
      description: 'Projects Completed'
    },
    { 
      id: 'post-implementation',
      title: 'Post Implementation', 
      value: kpis.projectKPIs.postImplementation, 
      icon: ShieldCheckIcon, 
      gradient: 'from-pink-500 to-pink-600',
      description: 'Post Implementation'
    }
  ];

  // Customer Payment KPI cards
  const customerPaymentKPIs = [
    { id: 'total-projects', title: 'Total Projects', value: kpis.financialKPIs.totalProjects, icon: ClipboardDocumentListIcon, color: 'bg-blue-500' },
    { id: 'total-project-value', title: 'Total Project Value (₹)', value: kpis.financialKPIs.totalProjectValue?.toLocaleString() || '0', icon: CurrencyRupeeIcon, color: 'bg-green-500' },
    { id: 'payment-received', title: 'Payment Received (₹)', value: kpis.financialKPIs.totalPaymentsReceived?.toLocaleString() || '0', icon: CurrencyRupeeIcon, color: 'bg-indigo-500' },
    { id: 'payment-pending', title: 'Payment Pending (₹)', value: kpis.financialKPIs.totalPaymentsPending?.toLocaleString() || '0', icon: CurrencyRupeeIcon, color: 'bg-red-500' }
  ];
  
  const customerStatusKPIs = [
    { id: 'payment-completed', title: 'Payment Completed', value: kpis.financialKPIs?.paymentCompleted || 0, icon: CheckCircleIcon, color: 'bg-green-500' },
    { id: 'payment-pending', title: 'Payment Pending', value: kpis.financialKPIs?.paymentPending || 0, icon: ClockIcon, color: 'bg-orange-500' },
    { id: 'payment-overdue', title: 'Payment Overdue', value: kpis.financialKPIs?.paymentOverdue || 0, icon: ExclamationTriangleIcon, color: 'bg-red-500' }
  ];

  // Vendor Payment KPI cards
  const vendorPaymentKPIs = [
    { id: 'total-vendors', title: 'Total Vendors', value: kpis.vendorPaymentKPIs?.totalVendors || 0, icon: BuildingStorefrontIcon, color: 'bg-blue-500' },
    { id: 'total-payments', title: 'Total Payments (₹)', value: (kpis.vendorPaymentKPIs?.totalVendorPayments || 0).toLocaleString(), icon: CurrencyRupeeIcon, color: 'bg-green-500' },
    { id: 'invoice-raised', title: 'Invoice Raised (₹)', value: (kpis.vendorPaymentKPIs?.totalVendorInvoiceRaised || 0).toLocaleString(), icon: CurrencyRupeeIcon, color: 'bg-indigo-500' },
    { id: 'pending-payments', title: 'Pending Payments (₹)', value: (kpis.vendorPaymentKPIs?.totalVendorPaymentsPending || 0).toLocaleString(), icon: ClockIcon, color: 'bg-yellow-500' }
  ];

  // Vendor Payment Status cards
  const vendorStatusKPIs = [
    { id: 'vendor-payment-completed', title: 'Payment Completed', value: kpis.vendorPaymentKPIs?.paymentCompleted || 0, icon: CheckCircleIcon, color: 'bg-green-500' },
    { id: 'vendor-payment-pending', title: 'Payment Pending', value: kpis.vendorPaymentKPIs?.paymentPending || 0, icon: ClockIcon, color: 'bg-orange-500' },
    { id: 'vendor-payment-overdue', title: 'Payment Overdue', value: kpis.vendorPaymentKPIs?.paymentOverdue || 0, icon: ExclamationTriangleIcon, color: 'bg-red-500' }
  ];

  // Inventory KPI cards
  const inventoryKPIs = [
    { id: 'total-inventory-value', title: 'Total Inventory Value (₹)', value: (kpis.inventoryKPIs?.totalInventoryValue || 0).toLocaleString(), icon: CubeIcon, color: 'bg-blue-500' },
    { id: 'shop-floor-value', title: 'Shop Floor Value (₹)', value: (kpis.inventoryKPIs?.totalPartsValueAtShopFloor || 0).toLocaleString(), icon: CubeIcon, color: 'bg-green-500' },
    { id: 'site-value', title: 'Site Value (₹)', value: (kpis.inventoryKPIs?.totalPartsValueAtSite || 0).toLocaleString(), icon: TruckIcon, color: 'bg-purple-500' },
    { id: 'low-stock-items', title: 'Low Stock Items', value: kpis.inventoryKPIs?.lowStockItems || 0, icon: ExclamationTriangleIcon, color: 'bg-red-500' }
  ];

  // Inventory Status Summary
  const inventoryStatusKPIs = [
    { id: 'items-shop-floor', title: 'Items at Shop Floor', value: kpis.inventoryKPIs?.itemsAtShopFloor || 0, icon: CubeIcon, color: 'bg-green-500' },
    { id: 'items-site', title: 'Items at Site', value: kpis.inventoryKPIs?.itemsAtSite || 0, icon: TruckIcon, color: 'bg-blue-500' },
    { id: 'total-items', title: 'Total Items', value: (kpis.inventoryKPIs?.itemsAtShopFloor || 0) + (kpis.inventoryKPIs?.itemsAtSite || 0), icon: ClipboardDocumentListIcon, color: 'bg-indigo-500' }
  ];

  // Quality Control KPI cards
  const qualityKPIs = [
    { id: 'total-issues', title: 'Total Issues', value: kpis.qualityKPIs.totalIssues || 0, icon: ExclamationTriangleIcon, color: 'bg-red-500' },
    { id: 'open-issues', title: 'Open Issues', value: kpis.qualityKPIs.openIssues, icon: ClockIcon, color: 'bg-orange-500' },
    { id: 'critical-issues', title: 'Critical Issues', value: kpis.qualityKPIs.criticalIssues || 0, icon: ExclamationTriangleIcon, color: 'bg-red-500' },
    { id: 'closed-issues', title: 'Closed Issues', value: kpis.qualityKPIs.closedIssues || 0, icon: CheckCircleIcon, color: 'bg-green-500' }
  ];

  // Quality Status Summary
  const qualityStatusKPIs = [
    { id: 'to-rectify', title: 'To Rectify', value: kpis.qualityKPIs.rectify, icon: WrenchIcon, color: 'bg-yellow-500' },
    { id: 'to-replace', title: 'To Replace', value: kpis.qualityKPIs.replace, icon: CubeIcon, color: 'bg-red-500' },
    { id: 'resolution-rate', title: 'Resolution Rate', value: `${kpis.qualityKPIs.totalIssues ? Math.round(((kpis.qualityKPIs.closedIssues || 0) / kpis.qualityKPIs.totalIssues) * 100) : 0}%`, icon: ShieldCheckIcon, color: 'bg-green-500' }
  ];

  // Enhanced KPI Card with gradient background - clickable to show project details
  const GradientKpiCard = ({ id, title, value, icon: Icon, gradient, description }) => {
    return (
      <div 
        className={`bg-gradient-to-r ${gradient} text-white rounded-lg shadow p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer`}
        onClick={() => handleStageClick(id, title)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-white text-opacity-90 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-white text-opacity-75 mt-1">{description}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white bg-opacity-20 rounded-full">
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const KpiCard = ({ id, title, value, icon: Icon, color }) => {
    return (
      <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${color} bg-opacity-10`}>
              <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">{title}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StatusKpiCard = ({ id, title, value, icon: Icon, color }) => {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors">
        <Icon className={`h-5 w-5 mx-auto ${color.replace('bg-', 'text-')}`} />
        <p className="text-xs text-gray-600 mt-1">{title}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    );
  };

  const FinancialBox = ({ title, icon: Icon, gradient, kpis, statusKpis }) => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} text-white p-4`}>
        <div className="flex items-center">
          <Icon className="h-6 w-6 mr-2" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={index} {...kpi} />
        ))}
      </div>
      
      {/* Status Summary */}
      {statusKpis && (
        <div className="px-4 pb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Status Summary</h4>
          <div className="grid grid-cols-3 gap-3">
            {statusKpis.map((kpi, index) => (
              <StatusKpiCard key={index} {...kpi} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Project KPIs - Enhanced with Gradient Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {projectKPIs.map((kpi, index) => (
            <GradientKpiCard key={index} {...kpi} />
          ))}
        </div>
      </div>

      {/* Financial Overview - Two Box Structure */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Payments Box */}
          <FinancialBox
            title="Customer Payments"
            icon={UserGroupIcon}
            gradient="from-blue-500 to-blue-600"
            kpis={customerPaymentKPIs}
            statusKpis={customerStatusKPIs}
          />
          
          {/* Vendor Payments Box */}
          <FinancialBox
            title="Vendor Payments"
            icon={BuildingStorefrontIcon}
            gradient="from-green-500 to-green-600"
            kpis={vendorPaymentKPIs}
            statusKpis={vendorStatusKPIs}
          />
        </div>
      </div>

      {/* Inventory & Quality Control - Two Box Structure */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Operations Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Box */}
          <FinancialBox
            title="Inventory Management"
            icon={CubeIcon}
            gradient="from-purple-500 to-purple-600"
            kpis={inventoryKPIs}
            statusKpis={inventoryStatusKPIs}
          />
          
          {/* Quality Control Box */}
          <FinancialBox
            title="Quality Control"
            icon={ShieldCheckIcon}
            gradient="from-orange-500 to-orange-600"
            kpis={qualityKPIs}
            statusKpis={qualityStatusKPIs}
          />
        </div>
      </div>

      {/* Project Details Modal */}
      <ProjectDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        stage={selectedStage}
        stageTitle={selectedStageTitle}
      />
    </div>
  );
};

export default Dashboard;