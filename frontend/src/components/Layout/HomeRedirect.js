import React from 'react';
import { Navigate } from 'react-router-dom';

// In your HomeRedirect.jsx, update the permissionRouteMap:

const permissionRouteMap = [
  { permission: 'dashboard', path: '/dashboard' },
  { permission: 'employee_master', path: '/employee-master' },
  { permission: 'employee_access', path: '/employee-access' },
  { permission: 'part_master', path: '/part-master' },
  { permission: 'project_master', path: '/project-master' },
  { permission: 'customer_master', path: '/customer-master' },
  { permission: 'vendor_master', path: '/vendor-master' },
  { permission: 'customer_boq', path: '/customer-boq' },
  { permission: 'inhouse_boq', path: '/inhouse-boq' },
  { permission: 'milestone_management', path: '/milestone-management' },
  { permission: 'inhouse_milestone', path: '/inhouse-milestone' },
  { permission: 'inventory_management', path: '/inventory-management' },
  { permission: 'quality_management', path: '/quality-management' },
  { permission: 'payment_master', path: '/payment-master' },
  { permission: 'project_budget_overview', path: '/project-budget' },
  { permission: 'project_expenditure_view', path: '/project-expenditures' },
  { permission: 'logistic_expenditure_view', path: '/logistic-expenditures' },
  { permission: 'purchase_request', path: '/purchase-requests' },
  { permission: 'production_management', path: '/production-management' },
  { permission: 'reports', path: '/reports' },
    { permission: 'inhouse_partmaster', path: '/inhouse-part-master' },
    { permission: 'stock_master', path: '/stock-master' },
];

const HomeRedirect = () => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];

  const firstAllowedRoute = permissionRouteMap.find(route => userPermissions.includes(route.permission));

  if (firstAllowedRoute) {
    return <Navigate to={firstAllowedRoute.path} replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // If no permissions match, or user object is not as expected, redirect to login
  return <Navigate to="/login" replace />;
};

export default HomeRedirect;