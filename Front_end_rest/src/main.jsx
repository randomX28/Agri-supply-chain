import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import './index.css'

import LoginPage from './pages/Auth/LoginPage'
import AppLayout from './layouts/AppLayout'
import AdminDashboardView from './pages/Roles/admin/AgriChainDashboard'
import DashboardHome from './pages/Shared/DashboardHome'
import HistoryLog from './pages/Shared/HistoryLog'
import Traceability from './pages/Shared/Traceability'

// Role Pages
import CreateBatch from './pages/Roles/farmer/CreateBatch'
import LogEvent from './pages/Roles/transport/LogEvent'
import CheckInOut from './pages/Roles/warehouse/CheckInOut'
import QualityCheck from './pages/Roles/inspector/QualityCheck'
import Marketplace from './pages/Roles/buyer/Marketplace'
import PurchaseHistory from './pages/Roles/buyer/PurchaseHistory'

const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'admin' || role === 'auditor') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default Entry: Login Page */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected App Routes (Wrapped in AppLayout) */}
          <Route element={<AppLayout />}>
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="history" element={<HistoryLog />} />
            <Route path="traceability" element={<Traceability />} />
            <Route path="traceability/:batchId" element={<Traceability />} />
            
            {/* Farmer Routes */}
            <Route path="farmer/create-batch" element={<CreateBatch />} />
            
            {/* Transport Routes */}
            <Route path="transport/log-event" element={<LogEvent />} />
            
            {/* Warehouse Routes */}
            <Route path="warehouse/check-in" element={<CheckInOut />} />
            <Route path="warehouse/check-out" element={<CheckInOut />} />
            
            {/* Inspector Routes */}
            <Route path="inspector/quality-check" element={<QualityCheck />} />
            
            {/* Buyer Routes */}
            <Route path="buyer/marketplace" element={<Marketplace />} />
            <Route path="buyer/purchases" element={<PurchaseHistory />} />
            
            {/* Admin Routes */}
            <Route path="admin" element={<AdminDashboardView />} />
          </Route>

          {/* Catch-all: back to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)
