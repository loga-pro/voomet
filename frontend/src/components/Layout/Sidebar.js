import React, { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// Lucide Icons (Beautiful + Modern)
import {
  LayoutDashboard,
  Users,
  Key,
  ClipboardList,
  Building2,
  Package,
  ShoppingBag,
  CalendarRange,
  MapPin,
  ClipboardCheck,
  PiggyBank,
  Calculator,
  Truck,
  Hammer,
  Wrench,
  FileText,
  BarChart3,
  Layers,
  Tags,
  Receipt,
} from "lucide-react";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const permissions = user.permissions || [];
  const isAdmin = user.role === "admin";
  const hasPermission = (perm) => isAdmin || permissions.includes(perm);
  const [openDropdown, setOpenDropdown] = useState(null);

  const MOBILE_SIDEBAR_MODE = "toggle";

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // ::::::::::::::::::::::::::::::::::::::::::
  //   Better, Cleaner, Modern Lucide Icons
  // ::::::::::::::::::::::::::::::::::::::::::

  const DropdownIcons = {
    "Plan Creation": <ClipboardList className="mr-3 h-4 w-4 text-blue-300" />,
    "Inhouse Milestone": <Building2 className="mr-3 h-4 w-4 text-blue-300" />,
    "Milestone Tracking": <MapPin className="mr-3 h-4 w-4 text-blue-300" />,

    "Customer Payment": <PiggyBank className="mr-3 h-4 w-4 text-blue-300" />,
    "Vendor Payment": <PiggyBank className="mr-3 h-4 w-4 text-blue-300" />,

    "Budget Overview": <BarChart3 className="mr-3 h-4 w-4 text-blue-300" />,
    "Project Expenditures": (
      <Calculator className="mr-3 h-4 w-4 text-blue-300" />
    ),
    "Logistic Expenditures": <Truck className="mr-3 h-4 w-4 text-blue-300" />,

    "Purchase Requisition": (
      <ClipboardCheck className="mr-3 h-4 w-4 text-blue-300" />
    ),
    "Production Entry System": (
      <Wrench className="mr-3 h-4 w-4 text-blue-300" />
    ),

    "Customer BOQ": <FileText className="mr-3 h-4 w-4 text-blue-300" />,
    "In-House BOQ": <Building2 className="mr-3 h-4 w-4 text-blue-300" />,
    Receipts: <Receipt className="mr-3 h-4 w-4 text-blue-300" />,
    Dispatches: <Truck className="mr-3 h-4 w-4 text-blue-300" />,
  };

  // ::::::::::::::::::::::::::::::::::::::::::
  //                  MENU
  // ::::::::::::::::::::::::::::::::::::::::::

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      permission: "dashboard",
    },
    {
      name: "Employee Master",
      path: "/employee-master",
      icon: Users,
      permission: "employee_master",
    },
    {
      name: "Employee Access",
      path: "/employee-access",
      icon: Key,
      permission: "employee_access",
    },
    {
      name: "Customer Master",
      path: "/customer-master",
      icon: Users,
      permission: "customer_master",
    },
    {
      name: "Project Master",
      path: "/project-master",
      icon: ClipboardList,
      permission: "project_master",
    },
    {
      name: "Vendor Master",
      path: "/vendor-master",
      icon: Building2,
      permission: "vendor_master",
    },
    {
      name: "Part Master",
      path: "/part-master",
      icon: Package,
      permission: "part_master",
    },

    // :::::::::: BOQ Management ::::::::::
    {
      name: "BOQ Management",
      icon: Layers,
      permission: "customer_boq",
      hasDropdown: true,
      children: [
        {
          name: "Customer BOQ",
          path: "/customer-boq",
          permission: "customer_boq",
        },
        {
          name: "In-House BOQ",
          path: "/inhouse-boq",
          permission: "inhouse_boq",
        },
      ],
    },

    // :::::::::: Milestone ::::::::::
    {
      name: "Milestone Management",
      icon: CalendarRange,
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

    // :::::::::: Inventory ::::::::::
    {
      name: "Inventory Management",
      icon: ShoppingBag,
      permission: "inventory_management",
      hasDropdown: true,
      children: [
        {
          name: "Inventory Summary",
          path: "/inventory-management",
          permission: "inventory_management",
        },
        {
          name: "Receipts",
          path: "/receipts",
          permission: "inventory_management",
        },
        {
          name: "Dispatches",
          path: "/dispatches",
          permission: "inventory_management",
        },
        {
          name: "Purchase Order",
          path: "/purchase-order",
          permission: "purchase_order",
        }
      ],
    },

    {
      name: "Quality Management",
      path: "/quality-management",
      icon: ClipboardCheck,
      permission: "quality_management",
    },

    // :::::::::: Payment ::::::::::
    {
      name: "Payment Master",
      icon: PiggyBank,
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

    // :::::::::: Budget ::::::::::
    {
      name: "Project Budget Management",
      icon: Calculator,
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
        {
          name: "Miscellaneous Expenditures",
          path: "/miscellaneous-expenditures",
          permission: "miscellaneous_expenditure",
        },
      ],
    },

    // :::::::::: Production ::::::::::
    {
      name: "Production Management System",
      icon: Hammer,
      permission: "purchase_request",
      hasDropdown: true,
      children: [
        {
          name: "Purchase Requisition",
          path: "/purchase-requests",
          permission: "purchase_request",
        },
        {
          name: "Production Entry System",
          path: "/production-management",
          permission: "production_management",
        },
      ],
    },

    {
      name: "Reports",
      path: "/reports",
      icon: FileText,
      permission: "reports",
    },
  ];

  const filteredMenuItems = menuItems
    .map((item) => {
      if (!item.hasDropdown) {
        return hasPermission(item.permission) ? item : null;
      }

      const allowedChildren = (item.children || []).filter((child) =>
        hasPermission(child.permission)
      );

      if (allowedChildren.length === 0) return null;

      return { ...item, children: allowedChildren };
    })
    .filter(Boolean);

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children)
      return item.children.some((child) => location.pathname === child.path);
    return false;
  };

  const isChildActive = (childPath) => location.pathname === childPath;

  // ::::::::::::::::::::::::::::::::::::::::::
  //              UI Rendering
  // ::::::::::::::::::::::::::::::::::::::::::

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-56 bg-blue-800 shadow-lg flex flex-col transform transition-transform duration-300
          lg:relative lg:translate-x-0
          ${
            MOBILE_SIDEBAR_MODE === "toggle"
              ? isOpen
                ? "translate-x-0"
                : "-translate-x-full"
              : ""
          }`}
      >
        {/* Logo */}
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

        {/* MENU */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <div key={item.name}>
              {item.hasDropdown ? (
                <>
                  {/* Dropdown Button */}
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all ${
                      isItemActive(item)
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
                      <ChevronDown className="h-4 w-4 text-white" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-blue-100" />
                    )}
                  </button>

                  {/* Dropdown Items */}
                  {openDropdown === item.name && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 bg-blue-900/50 rounded-lg py-2 border-l-2 border-blue-600">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md mx-1 transition-all ${
                            isChildActive(child.path)
                              ? "bg-blue-600 text-white border-l-2 border-white"
                              : "text-blue-100 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          {DropdownIcons[child.name] || (
                            <ClipboardCheck className="mr-3 h-4 w-4 text-blue-300" />
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
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all ${
                    isItemActive(item)
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

          {/* No Items */}
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
