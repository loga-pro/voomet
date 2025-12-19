import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import InactivityTracker from './InactivityTracker';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Inactivity Tracker - Auto logout after 20 minutes of no cursor movement */}
      <InactivityTracker />
      
      {/* Full Height Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area - includes Header and Outlet */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Header positioned after sidebar */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content with Outlet */}
        <main 
        className="flex-1 overflow-auto bg-gray-50 main-content"
        >
          <div className="max-w-none w-full h-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-2 px-4 lg:py-3 lg:px-6">
          <div className="flex justify-center items-center">
            <p className="text-xs lg:text-sm text-blue-600">
              Developed by <span className="font-semibold text-blue-800">CALDIM</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;