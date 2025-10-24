import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import {
  HomeIcon,
  UsersIcon,
  KeyIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CogIcon,
  TruckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const permissions = user.permissions || [];
  const [openDropdown, setOpenDropdown] = useState(null);

  const MOBILE_SIDEBAR_MODE = 'toggle';

  const toggleDropdown = (name) => {
    if (openDropdown === name) {
      setOpenDropdown(null);
    } else {
      setOpenDropdown(name);
    }
  };

  // Enhanced SVG Icons for dropdown items with consistent styling
  const DropdownIcons = {
    'Plan Creation': (
      <svg className="mr-3 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    'Milestone Tracking': (
      <svg className="mr-3 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    'Customer Payment': (
      <svg className="mr-3 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    'Vendor Payment': (
      <svg className="mr-3 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: HomeIcon,
      permission: 'dashboard'
    },
    { 
      name: 'Employee Master', 
      path: '/employee-master', 
      icon: UsersIcon,
      permission: 'employee_master'
    },
    { 
      name: 'Employee Access', 
      path: '/employee-access', 
      icon: KeyIcon,
      permission: 'employee_access'
    },
    { 
      name: 'Part Master', 
      path: '/part-master', 
      icon: CubeIcon,
      permission: 'part_master'
    },
    { 
      name: 'Project Master', 
      path: '/project-master', 
      icon: ClipboardDocumentListIcon,
      permission: 'project_master'
    },
    { 
      name: 'Customer Master', 
      path: '/customer-master', 
      icon: UsersIcon,
      permission: 'customer_master'
    },
    { 
      name: 'Vendor Master', 
      path: '/vendor-master', 
      icon: BuildingStorefrontIcon,
      permission: 'vendor_master'
    },
    { 
      name: 'BOQ Management', 
      path: '/boq-management', 
      icon: ChartBarIcon,
      permission: 'boq_management'
    },
    { 
      name: 'Milestone Management', 
      icon: CogIcon,
      permission: 'milestone_management',
      hasDropdown: true,
      children: [
        {
          name: 'Plan Creation',
          path: '/milestone-management',
          permission: 'milestone_management'
        },
        {
          name: 'Milestone Tracking',
          path: '/milestone-tracking',
          permission: 'milestone_management'
        }
      ]
    },
    { 
      name: 'Inventory Management', 
      path: '/inventory-management', 
      icon: TruckIcon,
      permission: 'inventory_management'
    },
    { 
      name: 'Quality Management', 
      path: '/quality-management', 
      icon: ShieldCheckIcon,
      permission: 'quality_management'
    },
    { 
      name: 'Payment Master', 
      path: '/payment-master', 
      icon: CurrencyDollarIcon,
      permission: 'payment_master',
      hasDropdown: true,
      children: [
        {
          name: 'Customer Payment',
          path: '/payment-master',
          permission: 'payment_master'
        },
        {
          name: 'Vendor Payment',
          path: '/vendor-payment',
          permission: 'payment_master'
        }
      ]
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: DocumentTextIcon,
      permission: 'reports'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    permissions.includes(item.permission)
  );

  // Helper function to check if a menu item or its children is active
  const isItemActive = (item) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return false;
  };

  // Helper function to check if a dropdown child is active
  const isChildActive = (childPath) => {
    return location.pathname === childPath;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Full Height Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-blue-800 shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto lg:h-screen
        ${MOBILE_SIDEBAR_MODE === 'open' ? 'translate-x-0' : MOBILE_SIDEBAR_MODE === 'hidden' ? '-translate-x-full' : (isOpen ? 'translate-x-0' : '-translate-x-full')}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-blue-700">
          <div className="text-center w-full">
            <img 
              src="/images/voomet-logo.png"
              alt="VOOMET" 
              className="w-full h-auto object-cover mx-auto"
            />
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden text-white p-1 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <div key={item.name}>
              {item.hasDropdown ? (
                <div>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full group flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isItemActive(item)
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className="mr-3 h-5 w-5 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate text-left">{item.name}</span>
                    </div>
                    {openDropdown === item.name ? (
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                    )}
                  </button>
                  
                  {/* Enhanced Dropdown items */}
                  {openDropdown === item.name && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 bg-blue-900/50 rounded-lg py-2 border-l-2 border-blue-600">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 mx-1 ${
                            isChildActive(child.path)
                              ? 'bg-blue-600 text-white shadow-sm border-l-2 border-white'
                              : 'text-blue-100 hover:bg-blue-600 hover:text-white hover:border-l-2 hover:border-blue-300'
                          }`}
                        >
                          {DropdownIcons[child.name] || (
                            <svg className="mr-3 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <span className="truncate text-left flex-1">{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isItemActive(item)
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate text-left">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
          
          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-200 text-sm">No menu items available</p>
              <p className="text-blue-300 text-xs mt-2">Check your permissions</p>
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;