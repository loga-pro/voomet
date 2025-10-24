import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const token = sessionStorage.getItem('token');
  const location = useLocation();

  // Prevent back button navigation to login
  useEffect(() => {
    // Store the current path to prevent going back to login
    if (location.pathname !== '/login') {
      window.history.replaceState(null, '', window.location.href);
    }

    const handlePopState = (event) => {
      // If trying to navigate back to login page, prevent it
      if (window.location.pathname === '/login') {
        window.history.forward(); // Go forward instead of allowing back to login
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some(permission => 
      user.permissions?.includes(permission)
    );
    
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;