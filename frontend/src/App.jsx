import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import AddFund from './pages/AddFund';
import SIPCalculator from './pages/SIPCalculator';
import Insights from './pages/Insights';
import InvestmentPlanner from './pages/InvestmentPlanner';
import { PortfolioProvider } from './context/PortfolioContext';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
      {/* All private routes share ONE PortfolioProvider — data fetched once */}
      <Route path="/*" element={
        <PrivateRoute>
          <PortfolioProvider>
            <Routes>
              <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
              <Route path="/portfolio" element={<Layout><Portfolio /></Layout>} />
              <Route path="/add-fund" element={<Layout><AddFund /></Layout>} />
              <Route path="/sip-calculator" element={<Layout><SIPCalculator /></Layout>} />
              <Route path="/insights" element={<Layout><Insights /></Layout>} />
              <Route path="/investment-planner" element={<Layout><InvestmentPlanner /></Layout>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </PortfolioProvider>
        </PrivateRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(99,130,255,0.2)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0f1629' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f1629' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
