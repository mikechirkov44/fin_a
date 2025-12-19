import apiService from './api'

export const exportService = {
  exportMoneyMovements: (params?: any) => {
    const format = params?.format || 'xlsx'
    return apiService.get(`/api/export/money-movements?format=${format}`, {
      params: { ...params, format: undefined },
      responseType: 'blob',
    }).then((blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `money_movements.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
  },
  exportRealizations: (params?: any) => {
    const format = params?.format || 'xlsx'
    return apiService.get(`/api/export/realizations?format=${format}`, {
      params: { ...params, format: undefined },
      responseType: 'blob',
    }).then((blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `realizations.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
  },
  exportProducts: (params?: any) => {
    const format = params?.format || 'xlsx'
    return apiService.get(`/api/export/products?format=${format}`, {
      params: { ...params, format: undefined },
      responseType: 'blob',
    }).then((blob: Blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
  },
}

export const importService = {
  importMoneyMovements: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/api/import/money-movements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  importProducts: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiService.post('/api/import/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

