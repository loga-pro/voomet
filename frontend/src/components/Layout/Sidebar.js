import React, { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
  DocumentTextIcon,
  CalculatorIcon,
  ChartPieIcon,
  MapPinIcon,
  CheckCircleIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ClipboardDocumentCheckIcon,
  ChartBarSquareIcon,
  WrenchScrewdriverIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const permissions = user.permissions || [];
  const isAdmin = user.role === 'admin';
  const hasPermission = (perm) => isAdmin || permissions.includes(perm);
  const [openDropdown, setOpenDropdown] = useState(null);

  const MOBILE_SIDEBAR_MODE = "toggle";

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const DropdownIcons = {
    'Plan Creation': (
      <ClipboardDocumentListIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Inhouse Milestone': (
      <BuildingOfficeIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Milestone Tracking': (
      <MapPinIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Customer Payment': (
      <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Vendor Payment': (
      <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Budget Overview': (
      <ChartBarSquareIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Project Expenditures': (
      <CalculatorIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Logistic Expenditures': (
      <TruckIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    // New icons for Production Management System
    'Purchase Requests': (
      <ClipboardDocumentCheckIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Production Management': (
      <WrenchScrewdriverIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Customer BOQ': (
      <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'In-House BOQ': (
      <BuildingOfficeIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
    'Material Request': (
      <TagIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
    ),
  };

  // Updated menuItems with Production Management System as parent
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: HomeIcon,
      permission: "dashboard",
    },
    {
      name: "Employee Master",
      path: "/employee-master",
      icon: UsersIcon,
      permission: "employee_master",
    },
    {
      name: "Employee Access",
      path: "/employee-access",
      icon: KeyIcon,
      permission: "employee_access",
    },
    {
      name: "Vendor Master",
      path: "/vendor-master",
      icon: BuildingStorefrontIcon,
      permission: "vendor_master",
    },
    {
      name: "Project Master",
      path: "/project-master",
      icon: ClipboardDocumentListIcon,
      permission: "project_master",
    },
    {
      name: "Customer Master",
      path: "/customer-master",
      icon: UsersIcon,
      permission: "customer_master",
    },
    {
      name: "Part Master",
      path: "/part-master",
      icon: CubeIcon,
      permission: "part_master",
    },
    {
      name: "BOQ Management",
      // path: "/boq-management",
      icon: ChartBarIcon,
      permission: "customer_boq", // Base permission for dropdown visibility
      hasDropdown: true,
      children: [
        {
          name: 'Customer BOQ',
          path: "/customer-boq",
          permission: 'customer_boq',
        },
        {
          name: 'In-House BOQ',
          path: "/inhouse-boq",
          permission: 'inoffice_boq',
        },

      ]
    },
    {
      name: "Milestone Management",
      icon: CalendarIcon,
      permission: "milestone_management",
      hasDropdown: true,
      children: [
        {
          name: "Plan Creation",
          path: "/milestone-management",
          permission: "milestone_management",
        },
        {
          name: "Inhouse Milestone",
          path: "/inhouse-milestone",
          permission: "inhouse_milestone",
        },
        {
          name: "Milestone Tracking",
          path: "/milestone-tracking",
          permission: "milestone_management",
        },
      ],
    },
    {
      name: "Inventory Management",
      path: "/inventory-management",
      icon: TruckIcon,
      permission: "inventory_management",
    },
    {
      name: "Quality Management",
      path: "/quality-management",
      icon: ShieldCheckIcon,
      permission: "quality_management",
    },
    {
      name: "Payment Master",
      icon: CurrencyDollarIcon,
      permission: "payment_master",
      hasDropdown: true,
      children: [
        {
          name: "Customer Payment",
          path: "/payment-master",
          permission: "payment_master",
        },
        {
          name: "Vendor Payment",
          path: "/vendor-payment",
          permission: "payment_master",
        },
      ],
    },
    {
      name: "Project Budget Management",
      icon: CalculatorIcon,
      permission: "project_budget",
      hasDropdown: true,
      children: [
        {
          name: "Budget Overview",
          path: "/project-budget",
          permission: "project_budget",
        },
        {
          name: "Project Expenditures",
          path: "/project-expenditures",
          permission: "project_expenditure",
        },
        {
          name: "Logistic Expenditures",
          path: "/logistic-expenditures",
          permission: "logistic_expenditure",
        },
      ],
    },
    {
      name: "Production Management System",
      icon: WrenchScrewdriverIcon,
      permission: "purchase_request",
      hasDropdown: true,
      children: [
        {
          name: "Purchase Requests",
          path: "/purchase-requests",
          permission: "purchase_request",
        },
        {
          name: "Production Management",
          path: "/production-management",
          permission: "production_management",
        },
      ],
    },
    {
      name: "Reports",
      path: "/reports",
      icon: DocumentTextIcon,
      permission: "reports",
    },
  ];

  const filteredMenuItems = menuItems
    .map(item => {
      if (!item.hasDropdown) {
        // Normal menu — check direct permission
        return hasPermission(item.permission) ? item : null;
      }

      // Dropdown menu — filter its children based on permission
      const allowedChildren = (item.children || []).filter(child =>
        hasPermission(child.permission)
      );

      if (allowedChildren.length === 0) {
        return null; // Hide entire dropdown if no child allowed
      }

      return {
        ...item,
        children: allowedChildren, // Return only the allowed children
      };
    })
    .filter(Boolean); // Remove nulls

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children)
      return item.children.some((child) => location.pathname === child.path);
    return false;
  };

  const isChildActive = (childPath) => location.pathname === childPath;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 lg:w-56 bg-blue-800 shadow-lg flex flex-col transform transition-transform duration-300
        lg:relative lg:translate-x-0
        ${MOBILE_SIDEBAR_MODE === "toggle"
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : ""
          }
      `}
      >
        <div className="flex items-center justify-between p-4 border-b border-blue-700">
          <div className="text-center w-full">
            <img
              src="/images/voomet-logo.png"
              alt="VOOMET"
              className="w-full h-auto mx-auto"
            />
          </div>

          <button
            onClick={onClose}
            className="lg:hidden text-white p-1 rounded-md hover:bg-blue-700"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <div key={item.name}>
              {item.hasDropdown ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all ${isItemActive(item)
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-blue-700 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      <span className="whitespace-normal break-words text-left">
                        {item.name}
                      </span>
                    </div>

                    {openDropdown === item.name ? (
                      <ChevronDown
                        className={`h-4 w-4 ${isItemActive(item) ? "text-white" : "text-blue-100"
                          }`}
                      />
                    ) : (
                      <ChevronRight
                        className={`h-4 w-4 ${isItemActive(item) ? "text-white" : "text-blue-100"
                          }`}
                      />
                    )}
                  </button>

                  {openDropdown === item.name && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 bg-blue-900/50 rounded-lg py-2 border-l-2 border-blue-600">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md mx-1 transition-all ${isChildActive(child.path)
                            ? "bg-blue-600 text-white border-l-2 border-white"
                            : "text-blue-100 hover:bg-blue-600 hover:text-white"
                            }`}
                        >
                          {DropdownIcons[child.name] || (
                            <CheckCircleIcon className="mr-3 h-4 w-4 flex-shrink-0 text-blue-300" />
                          )}

                          <span className="whitespace-normal break-words text-left">
                            {child.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all ${isItemActive(item)
                    ? "bg-blue-700 text-white"
                    : "text-blue-100 hover:bg-blue-700 hover:text-white"
                    }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="whitespace-normal break-words text-left">
                    {item.name}
                  </span>
                </Link>
              )}
            </div>
          ))}

          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8 text-blue-200 text-sm">
              No menu items available
              <div className="text-blue-300 text-xs mt-2">
                Check your permissions
              </div>
            </div>
          )}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;