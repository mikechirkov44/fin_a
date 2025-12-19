import axios, { AxiosInstance } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

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
  getIncomeItems: () => apiService.get('/api/reference/income-items'),
  createIncomeItem: (data: any) => apiService.post('/api/reference/income-items', data),
  updateIncomeItem: (id: number, data: any) => apiService.put(`/api/reference/income-items/${id}`, data),
  deleteIncomeItem: (id: number) => apiService.delete(`/api/reference/income-items/${id}`),
  getExpenseItems: () => apiService.get('/api/reference/expense-items'),
  createExpenseItem: (data: any) => apiService.post('/api/reference/expense-items', data),
  updateExpenseItem: (id: number, data: any) => apiService.put(`/api/reference/expense-items/${id}`, data),
  deleteExpenseItem: (id: number) => apiService.delete(`/api/reference/expense-items/${id}`),
  getPaymentPlaces: () => apiService.get('/api/reference/payment-places'),
  createPaymentPlace: (data: any) => apiService.post('/api/reference/payment-places', data),
  updatePaymentPlace: (id: number, data: any) => apiService.put(`/api/reference/payment-places/${id}`, data),
  deletePaymentPlace: (id: number) => apiService.delete(`/api/reference/payment-places/${id}`),
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

export const balanceService = {
  getBalance: (params?: any) => apiService.get('/api/balance/', { params }),
}

export const cashFlowService = {
  getReport: (params?: any) => apiService.get('/api/cash-flow/', { params }),
  getByCategory: (params?: any) => apiService.get('/api/cash-flow/by-category', { params }),
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

export default apiService

