import { useState, useEffect } from 'react'
import { realizationService, referenceService, productsService } from '../services/api'
import { exportService } from '../services/exportService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import { useFormValidation } from '../hooks/useFormValidation'
import { format } from 'date-fns'

interface RealizationItem {
  product_id: string
  quantity: string
  price: string
  cost_price: string
}

const Realization = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  
  const validation = useFormValidation({
    date: { required: true },
    company_id: { required: true },
    marketplace_id: { required: true },
  })
  const [realizations, setRealizations] = useState<any[]>([])
  const [allRealizations, setAllRealizations] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: selectedCompanyId || '',
    marketplace_id: '',
    description: '',
    items: [] as RealizationItem[],
  })

  useEffect(() => {
    loadData()
    loadMarketplaces()
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])

  const loadMarketplaces = async () => {
    try {
      const data = await referenceService.getMarketplaces()
      setMarketplaces(data)
    } catch (error) {
      console.error('Error loading marketplaces:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productsService.getProducts()
      setProducts(data.filter((p: any) => p.is_active))
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadData = async () => {
    try {
      const data = await realizationService.getRealizations({ limit: 1000 })
      setAllRealizations(data)
      setRealizations(data)
    } catch (error) {
      console.error('Error loading realizations:', error)
    }
  }

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
  }

  // Сортировка данных
  const sortData = (data: any[], column: string | null, direction: 'asc' | 'desc') => {
    if (!column) return data

    const sorted = [...data].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (column) {
        case 'date':
          aVal = a.date || ''
          bVal = b.date || ''
          break
        case 'company':
          aVal = getCompanyName(a.company_id)
          bVal = getCompanyName(b.company_id)
          break
        case 'marketplace':
          const aMarketplace = marketplaces.find(m => m.id === a.marketplace_id)?.name || ''
          const bMarketplace = marketplaces.find(m => m.id === b.marketplace_id)?.name || ''
          aVal = aMarketplace
          bVal = bMarketplace
          break
        case 'revenue':
          aVal = parseFloat(a.revenue) || 0
          bVal = parseFloat(b.revenue) || 0
          break
        case 'quantity':
          aVal = parseInt(a.quantity) || 0
          bVal = parseInt(b.quantity) || 0
          break
        case 'description':
          aVal = a.description || ''
          bVal = b.description || ''
          break
        default:
          return 0
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      } else {
        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (direction === 'asc') {
          return aStr.localeCompare(bStr, 'ru')
        } else {
          return bStr.localeCompare(aStr, 'ru')
        }
      }
    })

    return sorted
  }

  // Фильтрация и сортировка по поисковому запросу
  useEffect(() => {
    let filtered = allRealizations

    // Фильтрация по организации
    if (filterCompanyId) {
      const companyIdNum = parseInt(filterCompanyId)
      filtered = filtered.filter((realization) => realization.company_id === companyIdNum)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((realization) => {
        const marketplace = marketplaces.find(m => m.id === realization.marketplace_id)
        const companyName = getCompanyName(realization.company_id)?.toLowerCase() || ''
        // Поиск по товарам
        const itemsMatch = (realization.items || []).some((item: any) => {
          const productName = products.find(p => p.id === item.product_id)?.name?.toLowerCase() || ''
          return productName.includes(query)
        })
        return (
          realization.date?.toLowerCase().includes(query) ||
          marketplace?.name?.toLowerCase().includes(query) ||
          companyName.includes(query) ||
          realization.revenue?.toString().includes(query) ||
          realization.quantity?.toString().includes(query) ||
          realization.description?.toLowerCase().includes(query) ||
          itemsMatch
        )
      })
    }

    const sorted = sortData(filtered, sortColumn, sortDirection)
    setRealizations(sorted)
  }, [searchQuery, filterCompanyId, allRealizations, marketplaces, companies, products, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    if (!formData.items || formData.items.length === 0) {
      showError('Добавьте хотя бы один товар')
      return
    }
    
    // Валидация items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i]
      if (!item.product_id || !item.quantity || !item.price || !item.cost_price) {
        showError(`Заполните все поля в строке ${i + 1}`)
        return
      }
      if (parseInt(item.quantity) <= 0) {
        showError(`Количество должно быть больше 0 в строке ${i + 1}`)
        return
      }
      if (parseFloat(item.price) < 0 || parseFloat(item.cost_price) < 0) {
        showError(`Цены не могут быть отрицательными в строке ${i + 1}`)
        return
      }
    }
    
    try {
      const companyId = parseInt(String(formData.company_id))
      const marketplaceId = parseInt(String(formData.marketplace_id))
      
      const submitData = {
        date: formData.date,
        company_id: companyId,
        marketplace_id: marketplaceId,
        description: formData.description || null,
        items: formData.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          cost_price: parseFloat(item.cost_price),
        })),
      }
      if (editingItem) {
        await realizationService.updateRealization(editingItem.id, submitData)
      } else {
        await realizationService.createRealization(submitData)
      }
      handleClose()
      showSuccess(editingItem ? 'Реализация успешно обновлена' : 'Реализация успешно добавлена')
      loadData()
    } catch (error: any) {
      console.error('Error saving:', error)
      showError(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      company_id: selectedCompanyId || '',
      marketplace_id: '',
      description: '',
      items: [],
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: '1', price: '0', cost_price: '0' }],
    })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const updateItem = (index: number, field: keyof RealizationItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Автоматически подставляем себестоимость из товара при выборе
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product) {
        newItems[index].cost_price = product.cost_price?.toString() || '0'
        if (!newItems[index].price || newItems[index].price === '0') {
          newItems[index].price = product.selling_price?.toString() || '0'
        }
      }
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotalRevenue = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    }, 0)
  }

  const calculateTotalQuantity = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 0)
    }, 0)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingItem(null)
    resetForm()
    validation.clearAllErrors()
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      marketplace_id: item.marketplace_id?.toString() || '',
      description: item.description || '',
      items: (item.items || []).map((i: any) => ({
        product_id: i.product_id?.toString() || '',
        quantity: i.quantity?.toString() || '1',
        price: i.price?.toString() || '0',
        cost_price: i.cost_price?.toString() || '0',
      })),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись о реализации?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await realizationService.deleteRealization(id)
      showSuccess('Запись успешно удалена')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления записи')
    }
  }

  return (
    <div>
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingItem ? 'Редактировать реализацию' : 'Добавить реализацию'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField label="Дата" required error={validation.errors.date}>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value })
                  validation.clearError('date')
                }}
              />
            </FormField>
            <FormField label="Организация" required error={validation.errors.company_id}>
              <select
                value={formData.company_id}
                onChange={(e) => {
                  setFormData({ ...formData, company_id: e.target.value })
                  validation.clearError('company_id')
                }}
              >
                <option value="">Выберите...</option>
                {companies.filter(c => c.is_active).map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Маркетплейс" required error={validation.errors.marketplace_id}>
              <select
                value={formData.marketplace_id}
                onChange={(e) => {
                  setFormData({ ...formData, marketplace_id: e.target.value })
                  validation.clearError('marketplace_id')
                }}
              >
                <option value="">Выберите...</option>
                {marketplaces.filter(m => m.is_active).map(marketplace => (
                  <option key={marketplace.id} value={marketplace.id}>{marketplace.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Товары" required>
            <div style={{ marginBottom: '8px' }}>
              <button type="button" onClick={addItem} style={{ fontSize: '14px', padding: '6px 12px' }}>
                + Добавить товар
              </button>
            </div>
            {formData.items.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px dashed #ccc', borderRadius: '4px' }}>
                Нет товаров. Нажмите "Добавить товар" для начала.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}>Товар</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '100px' }}>Кол-во</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Цена</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Себест.</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Сумма</th>
                      <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px' }}>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            style={{ width: '100%', padding: '4px' }}
                          >
                            <option value="">Выберите...</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            style={{ width: '100%', padding: '4px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            style={{ width: '100%', padding: '4px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                            style={{ width: '100%', padding: '4px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>
                          {(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            style={{ padding: '4px 8px', fontSize: '16px', lineHeight: '1' }}
                            className="danger"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: '8px' }}>Итого:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {calculateTotalQuantity()}
                      </td>
                      <td style={{ padding: '8px' }}></td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {calculateTotalRevenue().toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </td>
                      <td style={{ padding: '8px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </FormField>
          <FormField label="Описание">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="primary">
              Сохранить
            </button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
              Добавить
            </button>
            <button onClick={() => exportService.exportRealizations({ format: 'xlsx' })}>
              Экспорт Excel
            </button>
            <button onClick={() => exportService.exportRealizations({ format: 'csv' })}>
              Экспорт CSV
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #808080',
                fontSize: '13px',
                width: '180px'
              }}
            >
              <option value="">Все организации</option>
              {companies.filter(c => c.is_active).map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #808080',
                fontSize: '13px',
                width: '200px'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th 
                onClick={() => handleSort('date')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Дата {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('company')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Организация {sortColumn === 'company' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('marketplace')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Маркетплейс {sortColumn === 'marketplace' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={() => handleSort('revenue')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Выручка {sortColumn === 'revenue' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={() => handleSort('quantity')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Количество {sortColumn === 'quantity' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('description')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Описание {sortColumn === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '100px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {realizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">Нет данных</td>
              </tr>
            ) : (
              realizations.map((realization) => (
                <tr 
                  key={realization.id}
                  className="clickable"
                  onClick={() => handleEdit(realization)}
                >
                  <td>{realization.date}</td>
                  <td>{getCompanyName(realization.company_id)}</td>
                  <td>{marketplaces.find(m => m.id === realization.marketplace_id)?.name || '-'}</td>
                  <td className="text-right">{parseFloat(realization.revenue).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                  <td className="text-right">
                    {realization.quantity}
                    {(realization.items && realization.items.length > 0) && (
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        ({realization.items.length} {realization.items.length === 1 ? 'товар' : 'товаров'})
                      </div>
                    )}
                  </td>
                  <td>{realization.description || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDelete(realization.id)} 
                      className="danger" 
                      title="Удалить"
                      style={{ padding: '4px 6px', fontSize: '16px', lineHeight: '1', minWidth: 'auto' }}
                    >✕</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Realization

