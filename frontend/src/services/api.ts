import axios, { AxiosInstance } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string | null) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete this.client.defaults.headers.common['Authorization']
    }
  }

  get(url: string, config?: any) {
    if (config?.responseType === 'blob') {
      return this.client.get(url, config).then((res) => res.data)
    }
    return this.client.get(url, config).then((res) => res.data)
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config).then((res) => res.data)
  }

  put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config).then((res) => res.data)
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config).then((res) => res.data)
  }
}

const apiService = new ApiService()

export const authService = {
  login: (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return apiService.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  register: (email: string, username: string, password: string) => {
    return apiService.post('/api/auth/register', { email, username, password })
  },
  getCurrentUser: () => {
    return apiService.get('/api/auth/me')
  },
  setToken: (token: string | null) => {
    apiService.setToken(token)
  },
}

export const referenceService = {
  // Income Groups
  getIncomeGroups: () => apiService.get('/api/reference/income-groups'),
  createIncomeGroup: (data: any) => apiService.post('/api/reference/income-groups', data),
  updateIncomeGroup: (id: number, data: any) => apiService.put(`/api/reference/income-groups/${id}`, data),
  deleteIncomeGroup: (id: number) => apiService.delete(`/api/reference/income-groups/${id}`),
  // Income Items
  getIncomeItems: () => apiService.get('/api/reference/income-items'),
  createIncomeItem: (data: any) => apiService.post('/api/reference/income-items', data),
  updateIncomeItem: (id: number, data: any) => apiService.put(`/api/reference/income-items/${id}`, data),
  deleteIncomeItem: (id: number) => apiService.delete(`/api/reference/income-items/${id}`),
  // Expense Groups
  getExpenseGroups: () => apiService.get('/api/reference/expense-groups'),
  createExpenseGroup: (data: any) => apiService.post('/api/reference/expense-groups', data),
  updateExpenseGroup: (id: number, data: any) => apiService.put(`/api/reference/expense-groups/${id}`, data),
  deleteExpenseGroup: (id: number) => apiService.delete(`/api/reference/expense-groups/${id}`),
  // Expense Items
  getExpenseItems: () => apiService.get('/api/reference/expense-items'),
  createExpenseItem: (data: any) => apiService.post('/api/reference/expense-items', data),
  updateExpenseItem: (id: number, data: any) => apiService.put(`/api/reference/expense-items/${id}`, data),
  deleteExpenseItem: (id: number) => apiService.delete(`/api/reference/expense-items/${id}`),
  // Payment Places
  getPaymentPlaces: () => apiService.get('/api/reference/payment-places'),
  createPaymentPlace: (data: any) => apiService.post('/api/reference/payment-places', data),
  updatePaymentPlace: (id: number, data: any) => apiService.put(`/api/reference/payment-places/${id}`, data),
  deletePaymentPlace: (id: number) => apiService.delete(`/api/reference/payment-places/${id}`),
  // Companies
  getCompanies: () => apiService.get('/api/reference/companies'),
  createCompany: (data: any) => apiService.post('/api/reference/companies', data),
  updateCompany: (id: number, data: any) => apiService.put(`/api/reference/companies/${id}`, data),
  deleteCompany: (id: number) => apiService.delete(`/api/reference/companies/${id}`),
  // Marketplaces
  getMarketplaces: () => apiService.get('/api/reference/marketplaces'),
  createMarketplace: (data: any) => apiService.post('/api/reference/marketplaces', data),
  updateMarketplace: (id: number, data: any) => apiService.put(`/api/reference/marketplaces/${id}`, data),
  deleteMarketplace: (id: number) => apiService.delete(`/api/reference/marketplaces/${id}`),
  // Expense Categories
  getExpenseCategories: () => apiService.get('/api/reference/expense-categories'),
  createExpenseCategory: (data: any) => apiService.post('/api/reference/expense-categories', data),
  updateExpenseCategory: (id: number, data: any) => apiService.put(`/api/reference/expense-categories/${id}`, data),
  deleteExpenseCategory: (id: number) => apiService.delete(`/api/reference/expense-categories/${id}`),
  // Sales Channels
  getSalesChannels: () => apiService.get('/api/reference/sales-channels'),
  createSalesChannel: (data: any) => apiService.post('/api/reference/sales-channels', data),
  updateSalesChannel: (id: number, data: any) => apiService.put(`/api/reference/sales-channels/${id}`, data),
  deleteSalesChannel: (id: number) => apiService.delete(`/api/reference/sales-channels/${id}`),
}

export const input1Service = {
  getMovements: (params?: any) => apiService.get('/api/input1/', { params }),
  createMovement: (data: any) => apiService.post('/api/input1/', data),
  updateMovement: (id: number, data: any) => apiService.put(`/api/input1/${id}`, data),
  deleteMovement: (id: number) => apiService.delete(`/api/input1/${id}`),
}

export const input2Service = {
  getAssets: (params?: any) => apiService.get('/api/input2/assets', { params }),
  createAsset: (data: any) => apiService.post('/api/input2/assets', data),
  updateAsset: (id: number, data: any) => apiService.put(`/api/input2/assets/${id}`, data),
  deleteAsset: (id: number) => apiService.delete(`/api/input2/assets/${id}`),
  getLiabilities: (params?: any) => apiService.get('/api/input2/liabilities', { params }),
  createLiability: (data: any) => apiService.post('/api/input2/liabilities', data),
  updateLiability: (id: number, data: any) => apiService.put(`/api/input2/liabilities/${id}`, data),
  deleteLiability: (id: number) => apiService.delete(`/api/input2/liabilities/${id}`),
}

export const marketplaceIntegrationService = {
  getIntegrations: (params?: any) => apiService.get('/api/marketplace-integration/', { params }),
  createIntegration: (data: any) => apiService.post('/api/marketplace-integration/', data),
  updateIntegration: (id: number, data: any) => apiService.put(`/api/marketplace-integration/${id}`, data),
  deleteIntegration: (id: number) => apiService.delete(`/api/marketplace-integration/${id}`),
  syncMarketplace: (data: any) => apiService.post('/api/marketplace-integration/sync', data),
  testConnection: (id: number) => apiService.post(`/api/marketplace-integration/test-connection?integration_id=${id}`),
}

export const balanceService = {
  getBalance: (params?: any) => apiService.get('/api/balance/', { params }),
}

export const cashFlowService = {
  getReport: (params?: any) => apiService.get('/api/cash-flow/', { params }),
  getByCategory: (params?: any) => apiService.get('/api/cash-flow/by-category', { params }),
  getByGroup: (params?: any) => apiService.get('/api/cash-flow/by-group', { params }),
}

export const cashFlowAnalysisService = {
  getAnalysis: (params?: any) => apiService.get('/api/cash-flow-analysis/', { params }),
}

export const profitLossService = {
  getReport: (params?: any) => apiService.get('/api/profit-loss/', { params }),
}

export const profitLossAnalysisService = {
  getAnalysis: (params?: any) => apiService.get('/api/profit-loss-analysis/', { params }),
}

export const realizationService = {
  getRealizations: (params?: any) => apiService.get('/api/realization/', { params }),
  createRealization: (data: any) => apiService.post('/api/realization/', data),
  updateRealization: (id: number, data: any) => apiService.put(`/api/realization/${id}`, data),
  deleteRealization: (id: number) => apiService.delete(`/api/realization/${id}`),
}

export const shipmentService = {
  getShipments: (params?: any) => apiService.get('/api/shipment/', { params }),
  createShipment: (data: any) => apiService.post('/api/shipment/', data),
  updateShipment: (id: number, data: any) => apiService.put(`/api/shipment/${id}`, data),
  deleteShipment: (id: number) => apiService.delete(`/api/shipment/${id}`),
}

export const productsService = {
  getProducts: () => apiService.get('/api/products/'),
  createProduct: (data: any) => apiService.post('/api/products/', data),
  updateProduct: (id: number, data: any) => apiService.put(`/api/products/${id}`, data),
  deleteProduct: (id: number) => apiService.delete(`/api/products/${id}`),
}

export const dashboardService = {
  getDashboard: (params?: any) => apiService.get('/api/dashboard/', { params }),
}

export const auditService = {
  getLogs: (params?: any) => apiService.get('/api/audit/logs', { params }),
  getLogsByRecord: (recordId: number, tableName: string) => 
    apiService.get(`/api/audit/logs/${recordId}`, { params: { table_name: tableName } }),
  getStats: (params?: any) => apiService.get('/api/audit/stats', { params }),
}

export const budgetService = {
  getBudgets: (params?: any) => apiService.get('/api/budget/', { params }),
  createBudget: (data: any) => apiService.post('/api/budget/', data),
  updateBudget: (id: number, data: any) => apiService.put(`/api/budget/${id}`, data),
  deleteBudget: (id: number) => apiService.delete(`/api/budget/${id}`),
  getComparison: (params?: any) => apiService.get('/api/budget/comparison', { params }),
}

export const notificationService = {
  getNotifications: (params?: any) => apiService.get('/api/notifications/', { params }),
  getUnreadCount: () => apiService.get('/api/notifications/unread-count'),
  markAsRead: (id: number) => apiService.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => apiService.put('/api/notifications/read-all'),
  deleteNotification: (id: number) => apiService.delete(`/api/notifications/${id}`),
}

export const usersService = {
  getUsers: (params?: any) => apiService.get('/api/users/', { params }),
  createUser: (data: any) => apiService.post('/api/users/', data),
  updateUser: (id: number, data: any) => apiService.put(`/api/users/${id}`, data),
  getUserCompanies: (userId: number) => apiService.get(`/api/users/${userId}/companies`),
  addUserToCompany: (userId: number, data: any) => apiService.post(`/api/users/${userId}/companies`, data),
  removeUserFromCompany: (userId: number, companyId: number) => 
    apiService.delete(`/api/users/${userId}/companies/${companyId}`),
}

export const warehousesService = {
  getWarehouses: (params?: any) => apiService.get('/api/warehouses/', { params }),
  createWarehouse: (data: any) => apiService.post('/api/warehouses/', data),
  updateWarehouse: (id: number, data: any) => apiService.put(`/api/warehouses/${id}`, data),
  deleteWarehouse: (id: number) => apiService.delete(`/api/warehouses/${id}`),
}

export const inventoryService = {
  getInventory: (params?: any) => apiService.get('/api/inventory/', { params }),
  createInventory: (data: any) => apiService.post('/api/inventory/', data),
  getTransactions: (params?: any) => apiService.get('/api/inventory/transactions', { params }),
  createTransaction: (data: any) => apiService.post('/api/inventory/transactions', data),
  getTurnover: (params?: any) => apiService.get('/api/inventory/turnover', { params }),
  getAlerts: (params?: any) => apiService.get('/api/inventory/alerts', { params }),
}

export default apiService

