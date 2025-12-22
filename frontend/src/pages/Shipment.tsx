import { useState, useEffect } from 'react'
import { shipmentService, productsService, referenceService } from '../services/api'
import { useCompany } from '../contexts/CompanyContext'
import { format } from 'date-fns'

const Shipment = () => {
  const { selectedCompanyId, companies } = useCompany()
  const [shipments, setShipments] = useState<any[]>([])
  const [allShipments, setAllShipments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
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
      setShipments(data)
    } catch (error) {
      console.error('Error loading shipments:', error)
    }
  }

  const getProductName = (id: number | null) => {
    if (!id) return '-'
    const product = products.find(p => p.id === id)
    return product?.name || '-'
  }

  // Фильтрация по поисковому запросу
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShipments(allShipments)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = allShipments.filter((shipment) => {
      const productName = getProductName(shipment.product_id)?.toLowerCase() || ''
      const marketplace = marketplaces.find(m => m.id === shipment.marketplace_id)
      return (
        shipment.date?.toLowerCase().includes(query) ||
        productName.includes(query) ||
        marketplace?.name?.toLowerCase().includes(query) ||
        shipment.quantity?.toString().includes(query) ||
        shipment.cost_price?.toString().includes(query) ||
        shipment.description?.toLowerCase().includes(query)
      )
    })
    setShipments(filtered)
  }, [searchQuery, allShipments, products])

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
      const submitData = {
        ...formData,
        company_id: parseInt(formData.company_id),
        product_id: formData.product_id ? parseInt(formData.product_id) : null,
        marketplace_id: parseInt(formData.marketplace_id),
        quantity: parseInt(formData.quantity),
        cost_price: parseFloat(formData.cost_price),
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
    } catch (error) {
      console.error('Error saving:', error)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <th>Дата</th>
              <th>Товар</th>
              <th>Маркетплейс</th>
              <th className="text-right">Количество</th>
              <th className="text-right">Себестоимость (ед.)</th>
              <th className="text-right">Итого</th>
              <th>Описание</th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">Нет данных</td>
              </tr>
            ) : (
              shipments.map((shipment) => {
                const total = parseFloat(shipment.cost_price) * shipment.quantity
                return (
                  <tr key={shipment.id}>
                    <td>{shipment.date}</td>
                    <td>{getProductName(shipment.product_id)}</td>
                    <td>{marketplaces.find(m => m.id === shipment.marketplace_id)?.name || '-'}</td>
                    <td className="text-right">{shipment.quantity}</td>
                    <td className="text-right">{parseFloat(shipment.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td className="text-right">{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td>{shipment.description || '-'}</td>
                    <td>
                      <button onClick={() => handleEdit(shipment)} style={{ marginRight: '4px' }}>Изменить</button>
                      <button onClick={() => handleDelete(shipment.id)} className="danger">Удалить</button>
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

