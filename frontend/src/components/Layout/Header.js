import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{"name":"John Doe","email":"john.doe@example.com"}');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Map routes to page titles
  const getPageTitle = () => {
    const routeTitles = {
      '/dashboard': 'Dashboard',
      '/employee-master': 'Employee Master',
      '/employee-access': 'Employee Access',
      '/part-master': 'Part Master',
      '/project-master': 'Project Master',
      '/customer-master': 'Customer Master',
      '/vendor-master': 'Vendor Master',
      '/boq-management': 'BOQ Management',
      '/milestone-management': 'Plan Creation',
      '/milestone-tracking': 'Milestone Tracking',
      '/inventory-management': 'Inventory Management',
      '/quality-management': 'Quality Management',
      '/payment-master': 'Customer Payment',
      '/vendor-payment': 'Vendor Payment',
      '/reports': 'Report'
    };
    
    // Check for milestone-tracking with ID
    if (location.pathname.startsWith('/milestone-tracking/')) {
      return 'Milestone Tracking';
    }

    return routeTitles[location.pathname] || 'Dashboard';
  };

  // Get the first letter of the user's name for the avatar
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Update time every second to include seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Format date and time with seconds
  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Time with seconds
  const formattedTimeWithSeconds = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Time without seconds for mobile
  const formattedTime = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 w-full">
      <div className="flex justify-between items-center px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-voometBlue focus:ring-opacity-50"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 ml-2 lg:ml-0">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Time Display - Outside Profile */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-600">{formattedTimeWithSeconds}</span>
            <span className="text-xs text-gray-500">{formattedDate}</span>
          </div>
          
          {/* Mobile Time Display */}
          <div className="sm:hidden flex flex-col items-end">
            <span className="text-sm font-medium text-gray-600">{formattedTime}</span>
          </div>

          {/* Profile Section */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-voometBlue focus:ring-opacity-50"
              aria-label="User menu"
              aria-expanded={isProfileOpen}
            >
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-voometBlue text-white font-medium text-sm sm:text-lg">
                {userInitial}
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden z-50 animate-fade-in transform-origin-top-right"
                role="menu"
                aria-orientation="vertical"
              >
                {/* User Info Section */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-voometBlue text-white font-medium text-xl">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Logout Section */}
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150 focus:outline-none focus:bg-red-50"
                    role="menuitem"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Animation Styles */}
      <style>
        {`
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              transform: translateY(-10px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
        `}
      </style>
    </header>
  );
};

export default Header;