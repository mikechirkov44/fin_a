import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Reference from './pages/Reference'
import Input1 from './pages/Input1'
import BankCash from './pages/BankCash'
import AccountBalances from './pages/AccountBalances'
import Input2 from './pages/Input2'
import Balance from './pages/Balance'
import CashFlow from './pages/CashFlow'
import CashFlowAnalysis from './pages/CashFlowAnalysis'
import ProfitLoss from './pages/ProfitLoss'
import ProfitLossAnalysis from './pages/ProfitLossAnalysis'
import Realization from './pages/Realization'
import Shipment from './pages/Shipment'
import Products from './pages/Products'
import MarketplaceIntegration from './pages/MarketplaceIntegration'
import AuditLog from './pages/AuditLog'
import Budget from './pages/Budget'
import Users from './pages/Users'
import Warehouses from './pages/Warehouses'
import Inventory from './pages/Inventory'
import InventoryTransactions from './pages/InventoryTransactions'
import WarehouseReports from './pages/WarehouseReports'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Recommendations from './pages/Recommendations'

// Ограничение доступа по роли администратора (глобальный или в компании)
const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth()
  const isGlobalAdmin = user?.role === 'ADMIN'
  const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false
  const isCompanyAdmin = isGlobalAdmin || hasAdminRoleInCompany

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isCompanyAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <Layout />
                      </PrivateRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="reference" element={<Reference />} />
                    <Route path="input1" element={<Navigate to="/bank-cash" replace />} />
                    <Route path="bank-cash" element={<BankCash />} />
                    <Route path="account-balances" element={<AccountBalances />} />
                    <Route path="input2" element={<Input2 />} />
                    <Route path="balance" element={<Balance />} />
                    <Route path="cash-flow" element={<CashFlow />} />
                    <Route path="cash-flow-analysis" element={<CashFlowAnalysis />} />
                    <Route path="profit-loss" element={<ProfitLoss />} />
                    <Route path="profit-loss-analysis" element={<ProfitLossAnalysis />} />
                    <Route path="realization" element={<Realization />} />
                    <Route path="shipment" element={<Shipment />} />
                    <Route path="products" element={<Products />} />
                    <Route path="marketplace-integration" element={<MarketplaceIntegration />} />
                    <Route
                      path="audit-log"
                      element={
                        <AdminRoute>
                          <AuditLog />
                        </AdminRoute>
                      }
                    />
                    <Route path="budget" element={<Budget />} />
                    <Route
                      path="users"
                      element={
                        <AdminRoute>
                          <Users />
                        </AdminRoute>
                      }
                    />
                    <Route path="warehouses" element={<Warehouses />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="inventory-transactions" element={<InventoryTransactions />} />
                    <Route path="warehouse-reports" element={<WarehouseReports />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="suppliers" element={<Suppliers />} />
                    <Route path="recommendations" element={<Recommendations />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="help" element={<Help />} />
                  </Route>
                </Routes>
              </Router>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App

