import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';

import HomeRedirect from './components/Layout/HomeRedirect';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeMaster from './pages/EmployeeMaster';
import EmployeeAccess from './pages/EmployeeAccess';
import PartMaster from './pages/PartMaster';
import ProjectMaster from './pages/ProjectMaster';
import CustomerMaster from './pages/CustomerMaster';
import VendorMaster from './pages/VendorMaster';
import MilestoneManagement from './pages/MilestoneManagement';
import MilestoneTracking from './pages/MilestoneTracking';
import InventoryManagement from './pages/InventoryManagement';
import QualityManagement from './pages/QualityManagement';
import PaymentMaster from './pages/PaymentMaster';
import Vendorpayment from './pages/Vendorpayment';
import ProjectBudgetManagement from './pages/ProjectBudgetManagement';
import ProjectExpenditureManagement from './pages/ProjectExpenditureManagement';
import LogisticExpenditureManagement from './pages/LogisticExpenditureManagement';
import Production from './pages/ProductionManagement';
import PurchaseRequests from './pages/PurchaseRequestManagement';
import Reports from './pages/Reports';
import TestOptimizedPDF from './pages/TestOptimizedPDF';
import PDFTestPage from './components/Reports/PDFTestPage';
import CustomerBoqManagement from './pages/CustomerBoqManagement';
import InHouseBoqManagement from './pages/InHouseBoqManagement';
import InhousePartMaster from './pages/InhousePartMaster';
import InhouseMilestone from './pages/InhouseMilestone';
import InhouseMilestoneForm from './components/Forms/InhouseMilestoneForm';
import StockMaster from './pages/StockMaster';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={
              <ProtectedRoute requiredPermissions={['dashboard']}>
                <Dashboard />
              </ProtectedRoute>
            } />
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
            <Route path="customer-boq" element={
              <ProtectedRoute requiredPermissions={['customer_boq']}>
                <CustomerBoqManagement />
              </ProtectedRoute>
            } />
            <Route path="inhouse-boq" element={
              <ProtectedRoute requiredPermissions={['inhouse_boq']}>
                <InHouseBoqManagement />
              </ProtectedRoute>
            } />
            <Route path="inhouse-milestone">
              <Route index element={
                <ProtectedRoute requiredPermissions={['inhouse_milestone']}>
                  <InhouseMilestone />
                </ProtectedRoute>
              } />
              <Route path="edit" element={
                <ProtectedRoute requiredPermissions={['inhouse_milestone']}>
                  <InhouseMilestoneForm
                  // onSuccess={handleFormSuccess}
                  // onEmailChange={handleEmailChange}
                  // onCancel={() => {
                  //   setShowModal(false);
                  //   setEditingMilestone(null);
                  // }}
                  // showNotification={showSuccess}
                  // showError={showError}
                  />
                </ProtectedRoute>
              } />
            </Route>
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
            <Route path="stock-master" element={
              <ProtectedRoute requiredPermissions={['stock_master']}>
                <StockMaster />
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
                <Vendorpayment />
              </ProtectedRoute>
            } />

            <Route path="project-budget" element={
              <ProtectedRoute requiredPermissions={['project_budget']}>
                <ProjectBudgetManagement />
              </ProtectedRoute>
            } />
            <Route path="project-expenditures" element={
              <ProtectedRoute requiredPermissions={['project_expenditure']}>
                <ProjectExpenditureManagement />
              </ProtectedRoute>
            } />
            <Route path="logistic-expenditures" element={
              <ProtectedRoute requiredPermissions={['logistic_expenditure']}>
                <LogisticExpenditureManagement />
              </ProtectedRoute>
            } />
            <Route path="production-management" element={
              <ProtectedRoute requiredPermissions={['production_management']}>
                <Production />
              </ProtectedRoute>
            } />
            <Route path="purchase-requests" element={
              <ProtectedRoute requiredPermissions={['purchase_request']}>
                <PurchaseRequests />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredPermissions={['reports']}>
                <Reports />
              </ProtectedRoute>
            } />

            <Route path="inhouse-part-master" element={
              <ProtectedRoute requiredPermissions={['inhouse_partmaster']}>
                <InhousePartMaster />
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