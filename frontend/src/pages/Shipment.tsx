import { useState, useEffect } from 'react'
import { shipmentService, productsService, referenceService } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useCompany } from '../contexts/CompanyContext'
import { format } from 'date-fns'

const Shipment = () => {
  const { selectedCompanyId, companies } = useCompany()
  const [shipments, setShipments] = useState<any[]>([])
  const [allShipments, setAllShipments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [products, setProducts] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: selectedCompanyId || '',
    product_id: '',
    marketplace_id: '',
    quantity: '',
    cost_price: '',
    description: '',
  })

  useEffect(() => {
    loadData()
    loadProducts()
    loadMarketplaces()
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

  const loadData = async () => {
    try {
      const data = await shipmentService.getShipments({ limit: 1000 })
      setAllShipments(data)
    } catch (error) {
      console.error('Error loading shipments:', error)
    }
  }

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
  }

  // Фильтрация и сортировка по поисковому запросу
  useEffect(() => {
    // Функция для получения имени продукта (используется внутри эффекта)
    const getProductNameLocal = (id: number | null) => {
      if (!id) return '-'
      const product = products.find(p => p.id === id)
      return product?.name || '-'
    }

    if (allShipments.length === 0) {
      setShipments([])
      return
    }

    let filtered = [...allShipments]

    // Фильтрация по организации
    if (filterCompanyId) {
      const companyIdNum = parseInt(filterCompanyId)
      filtered = filtered.filter((shipment) => shipment.company_id === companyIdNum)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((shipment) => {
        const productName = getProductNameLocal(shipment.product_id)?.toLowerCase() || ''
        const marketplace = marketplaces.find(m => m.id === shipment.marketplace_id)
        const companyName = getCompanyName(shipment.company_id)?.toLowerCase() || ''
        return (
          shipment.date?.toLowerCase().includes(query) ||
          productName.includes(query) ||
          marketplace?.name?.toLowerCase().includes(query) ||
          companyName.includes(query) ||
          shipment.quantity?.toString().includes(query) ||
          shipment.cost_price?.toString().includes(query) ||
          shipment.description?.toLowerCase().includes(query)
        )
      })
    }

    // Сортировка данных
    if (sortColumn) {
      const sorted = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortColumn) {
          case 'date':
            aVal = a.date || ''
            bVal = b.date || ''
            break
          case 'product':
            aVal = getProductNameLocal(a.product_id)
            bVal = getProductNameLocal(b.product_id)
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
          case 'quantity':
            aVal = parseInt(String(a.quantity)) || 0
            bVal = parseInt(String(b.quantity)) || 0
            break
          case 'cost_price':
            aVal = parseFloat(String(a.cost_price)) || 0
            bVal = parseFloat(String(b.cost_price)) || 0
            break
          case 'total':
            const aTotal = parseFloat(String(a.cost_price)) * (parseInt(String(a.quantity)) || 0)
            const bTotal = parseFloat(String(b.cost_price)) * (parseInt(String(b.quantity)) || 0)
            aVal = aTotal
            bVal = bTotal
            break
          case 'description':
            aVal = a.description || ''
            bVal = b.description || ''
            break
          default:
            return 0
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        } else {
          const aStr = String(aVal).toLowerCase()
          const bStr = String(bVal).toLowerCase()
          if (sortDirection === 'asc') {
            return aStr.localeCompare(bStr, 'ru')
          } else {
            return bStr.localeCompare(aStr, 'ru')
          }
        }
      })
      filtered = sorted
    }

    setShipments(filtered)
  }, [searchQuery, filterCompanyId, allShipments, products, marketplaces, companies, sortColumn, sortDirection])

  const getProductName = (id: number | null) => {
    if (!id) return '-'
    const product = products.find(p => p.id === id)
    return product?.name || '-'
  }

  const handleSort = (column: string) => {
    console.log('handleSort called:', column, 'current sortColumn:', sortColumn)
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productsService.getProducts()
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const companyId = parseInt(String(formData.company_id))
      const marketplaceId = parseInt(String(formData.marketplace_id))
      
      if (!companyId || !marketplaceId) {
        alert('Пожалуйста, выберите организацию и маркетплейс')
        return
      }
      
      const submitData = {
        date: formData.date,
        company_id: companyId,
        product_id: formData.product_id ? parseInt(String(formData.product_id)) : null,
        marketplace_id: marketplaceId,
        quantity: parseInt(String(formData.quantity)),
        cost_price: parseFloat(String(formData.cost_price)),
        description: formData.description || null,
      }
      if (editingItem) {
        await shipmentService.updateShipment(editingItem.id, submitData)
      } else {
        await shipmentService.createShipment(submitData)
      }
      setShowForm(false)
      setEditingItem(null)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving:', error)
      alert(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      company_id: selectedCompanyId || '',
      product_id: '',
      marketplace_id: '',
      quantity: '',
      cost_price: '',
      description: '',
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      product_id: item.product_id?.toString() || '',
      marketplace_id: item.marketplace_id?.toString() || '',
      quantity: item.quantity.toString(),
      cost_price: item.cost_price.toString(),
      description: item.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      await shipmentService.deleteShipment(id)
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  return (
    <div>
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} отгрузку</div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Дата *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Товар</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                >
                  <option value="">Не указан</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Организация *</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  {companies.filter(c => c.is_active).map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Маркетплейс *</label>
                <select
                  value={formData.marketplace_id}
                  onChange={(e) => setFormData({ ...formData, marketplace_id: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  {marketplaces.filter(m => m.is_active).map(marketplace => (
                    <option key={marketplace.id} value={marketplace.id}>{marketplace.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Количество *</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Себестоимость (за единицу) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <button type="submit" className="primary mr-8">Сохранить</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); resetForm() }}>
              Отмена
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
              Добавить
            </button>
            <button onClick={() => exportService.exportShipments({ format: 'xlsx' })}>
              Экспорт Excel
            </button>
            <label style={{ fontSize: '13px', padding: '4px 8px', border: '1px solid #808080', cursor: 'pointer', borderRadius: '4px' }}>
              Импорт
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const result = await importService.importShipments(file)
                      alert(result.message)
                      if (result.errors && result.errors.length > 0) {
                        console.error('Ошибки импорта:', result.errors)
                        alert(`Ошибки: ${result.errors.slice(0, 5).join('; ')}${result.errors.length > 5 ? '...' : ''}`)
                      }
                      loadData()
                    } catch (error: any) {
                      alert(`Ошибка импорта: ${error.response?.data?.detail || error.message}`)
                    }
                  }
                  e.target.value = ''
                }}
              />
            </label>
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
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('date')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Дата {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('company')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Организация {sortColumn === 'company' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('product')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Товар {sortColumn === 'product' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('marketplace')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Маркетплейс {sortColumn === 'marketplace' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('quantity')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Количество {sortColumn === 'quantity' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('cost_price')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Себестоимость (ед.) {sortColumn === 'cost_price' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('total')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Итого {sortColumn === 'total' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('description')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Описание {sortColumn === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '100px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center">Нет данных</td>
              </tr>
            ) : (
              shipments.map((shipment) => {
                const total = parseFloat(shipment.cost_price) * shipment.quantity
                return (
                  <tr 
                    key={shipment.id}
                    className="clickable"
                    onClick={() => handleEdit(shipment)}
                  >
                    <td>{shipment.date}</td>
                    <td>{getCompanyName(shipment.company_id)}</td>
                    <td>{getProductName(shipment.product_id)}</td>
                    <td>{marketplaces.find(m => m.id === shipment.marketplace_id)?.name || '-'}</td>
                    <td className="text-right">{shipment.quantity}</td>
                    <td className="text-right">{parseFloat(shipment.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td className="text-right">{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td>{shipment.description || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleDelete(shipment.id)} 
                        className="danger" 
                        title="Удалить"
                        style={{ padding: '4px 6px', fontSize: '16px', lineHeight: '1', minWidth: 'auto' }}
                      >✕</button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Shipment

