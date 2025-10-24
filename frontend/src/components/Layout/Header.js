import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
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
      '/payment-master' : 'Customer Payment',
      '/vendor-payment' : 'Vendor payment',
      '/milestone-tracking': 'Milestone Tracking',
      '/reports' : 'Report'
    };
    
    return routeTitles[location.pathname] || 'Dashboard';
  };

  // Get the first letter of the user's name for the avatar
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Update time every second
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

  // Format date and time
  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
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
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 ml-2 lg:ml-0">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Time Display - Outside Profile */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-600">{formattedTime}</span>
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
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-voometBlue text-white font-medium text-sm sm:text-lg">
                {userInitial}
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden z-50 animate-fade-in">
                <div className="p-4 bg-voometBlue text-white rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white bg-opacity-20 text-white font-medium text-2xl shadow-inner">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold truncate">{user.name}</p>
                      <p className="text-sm text-white text-opacity-90 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full text-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
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