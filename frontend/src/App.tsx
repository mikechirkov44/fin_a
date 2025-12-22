import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CompanyProvider } from './contexts/CompanyContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Reference from './pages/Reference'
import Input1 from './pages/Input1'
import Input2 from './pages/Input2'
import Balance from './pages/Balance'
import CashFlow from './pages/CashFlow'
import CashFlowAnalysis from './pages/CashFlowAnalysis'
import ProfitLoss from './pages/ProfitLoss'
import ProfitLossAnalysis from './pages/ProfitLossAnalysis'
import Realization from './pages/Realization'
import Shipment from './pages/Shipment'
import Products from './pages/Products'

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
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
            <Route path="input1" element={<Input1 />} />
            <Route path="input2" element={<Input2 />} />
            <Route path="balance" element={<Balance />} />
            <Route path="cash-flow" element={<CashFlow />} />
            <Route path="cash-flow-analysis" element={<CashFlowAnalysis />} />
            <Route path="profit-loss" element={<ProfitLoss />} />
            <Route path="profit-loss-analysis" element={<ProfitLossAnalysis />} />
            <Route path="realization" element={<Realization />} />
            <Route path="shipment" element={<Shipment />} />
            <Route path="products" element={<Products />} />
          </Route>
        </Routes>
      </Router>
      </CompanyProvider>
    </AuthProvider>
  )
}

export default App

