import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Full Height Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area - includes Header and Outlet */}
      <div className="flex flex-col flex-1 w-full">
        {/* Header positioned after sidebar */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content with Outlet */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-none w-full h-full">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-3 px-6">
          <div className="flex justify-center items-center">
            <p className="text-sm text-blue-600">
              Developed by <span className="font-semibold text-blue-800">CALDIM</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;