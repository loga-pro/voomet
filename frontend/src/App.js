import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import EmployeeAccess from './pages/EmployeeAccess';
import PartMaster from './pages/PartMaster';
import ProjectMaster from './pages/ProjectMaster';
import CustomerMaster from './pages/CustomerMaster';
import VendorMaster from './pages/VendorMaster';
import BoqManagement from './pages/BoqManagement';
import MilestoneManagement from './pages/MilestoneManagement';
import MilestoneTracking from './pages/MilestoneTracking';
import InventoryManagement from './pages/InventoryManagement';
import QualityManagement from './pages/QualityManagement';
import PaymentMaster from './pages/PaymentMaster';
import Vendorpayment from './pages/Vendorpayment'
import Reports from './pages/Reports';
import TestOptimizedPDF from './pages/TestOptimizedPDF';
import PDFTestPage from './components/Reports/PDFTestPage';
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employee-master" element={
              <ProtectedRoute requiredPermissions={['employee_master']}>
                <EmployeeMaster />
              </ProtectedRoute>
            } />
            <Route path="employee-access" element={
              <ProtectedRoute requiredPermissions={['employee_access']}>
                <EmployeeAccess />
              </ProtectedRoute>
            } />
            <Route path="part-master" element={
              <ProtectedRoute requiredPermissions={['part_master']}>
                <PartMaster />
              </ProtectedRoute>
            } />
            <Route path="project-master" element={
              <ProtectedRoute requiredPermissions={['project_master']}>
                <ProjectMaster />
              </ProtectedRoute>
            } />
            <Route path="customer-master" element={
              <ProtectedRoute requiredPermissions={['customer_master']}>
                <CustomerMaster />
              </ProtectedRoute>
            } />
            <Route path="vendor-master" element={
              <ProtectedRoute requiredPermissions={['vendor_master']}>
                <VendorMaster />
              </ProtectedRoute>
            } />
            <Route path="boq-management" element={
              <ProtectedRoute requiredPermissions={['boq_management']}>
                <BoqManagement />
              </ProtectedRoute>
            } />
            <Route path="milestone-management" element={
              <ProtectedRoute requiredPermissions={['milestone_management']}>
                <MilestoneManagement />
              </ProtectedRoute>
            } />
            <Route path="milestone-tracking" element={
              <ProtectedRoute requiredPermissions={['milestone_management']}>
                <MilestoneTracking />
              </ProtectedRoute>
            } />
            <Route path="inventory-management" element={
              <ProtectedRoute requiredPermissions={['inventory_management']}>
                <InventoryManagement />
              </ProtectedRoute>
            } />
            <Route path="quality-management" element={
              <ProtectedRoute requiredPermissions={['quality_management']}>
                <QualityManagement />
              </ProtectedRoute>
            } />
            <Route path="payment-master" element={
              <ProtectedRoute requiredPermissions={['payment_master']}>
                <PaymentMaster />
              </ProtectedRoute>
            } />
            <Route path="vendor-payment" element={
              <ProtectedRoute requiredPermissions={['payment_master']}>
                <Vendorpayment/>
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredPermissions={['reports']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="test-pdf" element={<TestOptimizedPDF />} />
            <Route path="test-comprehensive-pdf" element={<PDFTestPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;