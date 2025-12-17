import React, { useState, useEffect, useRef } from 'react';
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
  ShieldCheckIcon,
  BanknotesIcon,
  CreditCardIcon,
  ExclamationCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { projectsAPI, customersAPI, vendorsAPI, dashboardAPI } from '../services/api';
import ProjectDetailsModal from '../components/Modals/ProjectDetailsModal';
import ProfitLossSummary from './ProfitLossSummary';

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
      totalPaymentsPending: 0,
      paymentCompleted: 0,
      paymentPending: 0,
      paymentOverdue: 0
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
      totalPartsValueAtCustomerEnd: 0,
      totalInventoryValue: 0,
      itemsAtShopFloor: 0,
      itemsAtSite: 0,
      itemsAtCustomerEnd: 0,
      lowStockItems: 0,
      totalItems: 0
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
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef(null);

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

  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        const stickyTop = stickyRef.current.offsetTop;
        setIsSticky(window.scrollY > stickyTop);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      <div className="flex justify-center items-center h-48 sm:h-64 p-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Project KPI cards
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

  // Customer Payment KPI cards (Updated with image values)
  const customerPaymentKPIs = [
    {
      id: 'total-projects',
      title: 'Total Projects',
      value: kpis.financialKPIs.totalProjects,
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500'
    },
    {
      id: 'total-project-value',
      title: 'Total Invoice Raised (₹)',
      value: kpis.financialKPIs.totalProjectValue.toLocaleString('en-IN'),
      icon: BanknotesIcon,
      color: 'bg-green-500'
    },
    {
      id: 'payment-received',
      title: 'Payment Received (₹)',
      value: kpis.financialKPIs.totalPaymentsReceived.toLocaleString('en-IN'),
      icon: CheckCircleIcon,
      color: 'bg-blue-500'
    },
    {
      id: 'payment-pending',
      title: 'Payment Pending (₹)',
      value: kpis.financialKPIs.totalPaymentsPending.toLocaleString('en-IN'),
      icon: ClockIcon,
      color: 'bg-yellow-500'
    }
  ];

  // Customer Status KPIs (3 items - smaller)
  const customerStatusKPIs = [
    {
      id: 'payment-completed',
      title: 'Completed',
      value: kpis.financialKPIs?.paymentCompleted || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      id: 'payment-pending',
      title: 'Pending',
      value: kpis.financialKPIs?.paymentPending || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500'
    },
    {
      id: 'payment-overdue',
      title: 'Overdue',
      value: kpis.financialKPIs?.paymentOverdue || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    }
  ];

  // Vendor Payment KPI cards (Updated with image values)
  const vendorPaymentKPIs = [
    {
      id: 'total-vendors',
      title: 'Total Vendors',
      value: kpis.vendorPaymentKPIs?.totalVendors || 0,
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      id: 'total-payments',
      title: 'Total Payments (₹)',
      value: (kpis.vendorPaymentKPIs?.totalVendorPayments || 0).toLocaleString('en-IN'),
      icon: CurrencyRupeeIcon,
      color: 'bg-green-500'
    },
    {
      id: 'invoice-raised',
      title: 'Invoice Raised (₹)',
      value: (kpis.vendorPaymentKPIs?.totalVendorInvoiceRaised || 0).toLocaleString('en-IN'),
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500'
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments (₹)',
      value: (kpis.vendorPaymentKPIs?.totalVendorPaymentsPending || 0).toLocaleString('en-IN'),
      icon: ClockIcon,
      color: 'bg-yellow-500'
    }
  ];

  // Vendor Status KPIs (3 items - smaller)
  const vendorStatusKPIs = [
    {
      id: 'vendor-payment-completed',
      title: 'Completed',
      value: kpis.vendorPaymentKPIs?.paymentCompleted || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      id: 'vendor-payment-pending',
      title: 'Pending',
      value: kpis.vendorPaymentKPIs?.paymentPending || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500'
    },
    {
      id: 'vendor-payment-overdue',
      title: 'Overdue',
      value: kpis.vendorPaymentKPIs?.paymentOverdue || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    }
  ];

  // Inventory KPI cards (Updated with image values)
  const inventoryKPIs = [
    {
      id: 'total-items',
      title: 'Total Items',
      value: kpis.inventoryKPIs?.totalItems || 0,
      icon: CubeIcon,
      color: 'bg-blue-500'
    },
    {
      id: 'shop-floor-value',
      title: 'Shop Floor Value (₹)',
      value: (kpis.inventoryKPIs?.totalPartsValueAtShopFloor || 0).toLocaleString('en-IN'),
      icon: BuildingStorefrontIcon,
      color: 'bg-indigo-500'
    },
    {
      id: 'site-value',
      title: 'Site Value (₹)',
      value: (kpis.inventoryKPIs?.totalPartsValueAtSite || 0).toLocaleString('en-IN'),
      icon: TruckIcon,
      color: 'bg-purple-500'
    },
    {
      id: 'customer-end-value',
      title: 'Customer End Value (₹)',
      value: (kpis.inventoryKPIs?.totalPartsValueAtCustomerEnd || 0).toLocaleString('en-IN'),
      icon: UserIcon,
      color: 'bg-pink-500'
    }
  ];

  // Inventory Status KPIs (3 items - smaller)
  const inventoryStatusKPIs = [
    {
      id: 'shop-floor-items',
      title: 'At Shop Floor',
      value: kpis.inventoryKPIs?.itemsAtShopFloor || 0,
      icon: BuildingStorefrontIcon,
      color: 'bg-indigo-500'
    },
    {
      id: 'site-items',
      title: 'At Site',
      value: kpis.inventoryKPIs?.itemsAtSite || 0,
      icon: TruckIcon,
      color: 'bg-purple-500'
    },
    {
      id: 'customer-end-items',
      title: 'Customer End',
      value: kpis.inventoryKPIs?.itemsAtCustomerEnd || 0,
      icon: UserIcon,
      color: 'bg-pink-500'
    }
  ];

  // Quality Control KPI cards (Updated to match image: Total Issues, Critical Issues, Open Issues, Closed Issues)
  const qualityKPIs = [
    {
      id: 'total-issues',
      title: 'Total Issues',
      value: kpis.qualityKPIs.totalIssues || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    },
    {
      id: 'critical-issues',
      title: 'Critical Issues',
      value: kpis.qualityKPIs.criticalIssues || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500'
    },
    {
      id: 'open-issues',
      title: 'Open Issues',
      value: kpis.qualityKPIs.openIssues || 0,
      icon: ClockIcon,
      color: 'bg-orange-500'
    },
    {
      id: 'closed-issues',
      title: 'Closed Issues',
      value: kpis.qualityKPIs.closedIssues || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    }
  ];

  // Quality Status KPIs (3 items - smaller, updated to match image: Rectify, Replace, Resolution Rate)
  const qualityStatusKPIs = [
    {
      id: 'to-rectify',
      title: 'Rectify',
      value: kpis.qualityKPIs.rectify || 0,
      icon: WrenchIcon,
      color: 'bg-yellow-500'
    },
    {
      id: 'to-replace',
      title: 'Replace',
      value: kpis.qualityKPIs.replace || 0,
      icon: CubeIcon,
      color: 'bg-red-500'
    },
    {
      id: 'resolution-rate',
      title: 'Resolution',
      value: `${kpis.qualityKPIs.totalIssues ? Math.round(((kpis.qualityKPIs.closedIssues || 0) / kpis.qualityKPIs.totalIssues) * 100) : 0}%`,
      icon: ShieldCheckIcon,
      color: 'bg-green-500'
    }
  ];

  // Gradient KPI Card Component
  const GradientKpiCard = ({ id, title, value, icon: Icon, gradient, description }) => {
    return (
      <div
        className={`bg-gradient-to-r ${gradient} text-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-all transform hover:scale-105 duration-200 cursor-pointer`}
        onClick={() => handleStageClick(id, title)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-white text-opacity-90 text-xs sm:text-sm font-medium">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-white text-opacity-75 mt-1 hidden sm:block">{description}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-white bg-opacity-20 rounded-full">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Regular KPI Card Component
  const KpiCard = ({ id, title, value, icon: Icon, color }) => {
    return (
      <div className="bg-white rounded-lg shadow m-2 p-3 sm:p-4 hover:shadow-md transition-all flex-grow min-w-[140px]">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10 mr-3`}>
            <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
            <p className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {typeof value === 'string' && value.includes('₹')
                ? value
                : value}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Compact Status KPI Card Component (Smaller as requested)
  const StatusKpiCard = ({ id, title, value, icon: Icon, color }) => {
    return (
      <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-center hover:bg-gray-100 transition-colors border border-gray-200">
        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${color} bg-opacity-10 mb-1`}>
          <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
        </div>
        <p className="text-xs text-gray-600 font-medium">{title}</p>
        <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    );
  };

  // Financial Box Component with smaller Status Summary
  const FinancialBox = ({ title, gradient, kpis, statusKpis }) => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} text-white p-3 sm:p-4 flex-shrink-0`}>
        <div className="flex items-center">
          <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
        </div>
      </div>

      {/* KPI Cards */}
      {/* <div className="p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3 flex-shrink-0"> */}

      {kpis.map((kpi, index) => (
        <KpiCard key={index} {...kpi} />
      ))}

      {/* </div> */}

      {/* Status Summary - Smaller section */}
      {statusKpis && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 mt-2">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Status Summary</h4>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {statusKpis.map((kpi, index) => (
              <StatusKpiCard key={index} {...kpi} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Sticky Project Status Overview */}
      <div
        ref={stickyRef}
        className={`transition-all duration-300 ${isSticky
          ? 'fixed top-0 left-0 right-0 z-50 bg-white shadow-lg border-b border-gray-200 p-4 mx-[-1rem] md:mx-[-1.5rem] lg:mx-[-2rem]'
          : 'relative'
          }`}
      >
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Project Status Overview
          {isSticky && <span className="text-xs text-gray-500 ml-2">(Pinned)</span>}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {projectKPIs.map((kpi, index) => (
            <GradientKpiCard key={index} {...kpi} />
          ))}
        </div>

        {isSticky && <div className="h-4"></div>}
      </div>

      {/* Spacer when sticky */}
      {isSticky && <div className="h-[200px] sm:h-[180px]"></div>}

      {/* Profit Loss Summary */}
      <ProfitLossSummary />

      {/* Business Overview - Compact layout */}
      <div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Business Overview</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Customer Payments */}
          <div className="flex flex-col">
            <FinancialBox
              title="Customer Payments"
              gradient="from-blue-500 to-blue-600"
              kpis={customerPaymentKPIs}
              statusKpis={customerStatusKPIs}
            />
          </div>

          {/* Vendor Payments */}
          <div className="flex flex-col">
            <FinancialBox
              title="Vendor Payments"
              gradient="from-green-500 to-green-600"
              kpis={vendorPaymentKPIs}
              statusKpis={vendorStatusKPIs}
            />
          </div>

          {/* Inventory Management */}
          <div className="flex flex-col">
            <FinancialBox
              title="Inventory Management"
              gradient="from-purple-500 to-purple-600"
              kpis={inventoryKPIs}
              statusKpis={inventoryStatusKPIs}
            />
          </div>

          {/* Quality Control */}
          {/* Quality Control */}
          <div className="flex flex-col">
            <FinancialBox
              title="Quality Control"
              gradient="from-orange-500 to-orange-600"
              kpis={qualityKPIs}
              statusKpis={qualityStatusKPIs}
            />
          </div>
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