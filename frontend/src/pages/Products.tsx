import { useState, useEffect } from 'react'
import { productsService } from '../services/api'
import { exportService, importService } from '../services/exportService'

const Products = () => {
  const [products, setProducts] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await productsService.getProducts()
      setAllProducts(data)
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Фильтрация по поисковому запросу
  useEffect(() => {
    if (!searchQuery.trim()) {
      setProducts(allProducts)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = allProducts.filter((product) => {
      return (
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.cost_price?.toString().includes(query) ||
        product.selling_price?.toString().includes(query)
      )
    })
    setProducts(filtered)
  }, [searchQuery, allProducts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
      }
      if (editingItem) {
        await productsService.updateProduct(editingItem.id, submitData)
      } else {
        await productsService.createProduct(submitData)
      }
      setShowForm(false)
      setEditingItem(null)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      cost_price: '',
      selling_price: '',
      description: '',
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      sku: item.sku,
      cost_price: item.cost_price.toString(),
      selling_price: item.selling_price?.toString() || '',
      description: item.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return
    try {
      await productsService.deleteProduct(id)
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  return (
    <div>
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} товар</div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Наименование *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Артикул (SKU) *</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Себестоимость *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Цена продажи</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
              Добавить
            </button>
            <button onClick={() => exportService.exportProducts({ format: 'xlsx' })}>
              Экспорт Excel
            </button>
            <button onClick={() => exportService.exportProducts({ format: 'csv' })}>
              Экспорт CSV
            </button>
            <label style={{ display: 'inline-block' }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const result = await importService.importProducts(file)
                      alert(result.message)
                      if (result.errors.length > 0) {
                        alert('Ошибки:\n' + result.errors.join('\n'))
                      }
                      loadData()
                    } catch (error: any) {
                      alert('Ошибка импорта: ' + (error.response?.data?.detail || error.message))
                    }
                  }
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
              <button type="button" onClick={() => (e.target as HTMLElement).parentElement?.querySelector('input')?.click()}>
                Импорт
              </button>
            </label>
          </div>
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
              <th>Наименование</th>
              <th>Артикул</th>
              <th className="text-right">Себестоимость</th>
              <th className="text-right">Цена продажи</th>
              <th className="text-right">Маржа</th>
              <th>Описание</th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">Нет данных</td>
              </tr>
            ) : (
              products.map((product) => {
                const margin = product.selling_price
                  ? ((parseFloat(product.selling_price) - parseFloat(product.cost_price)) / parseFloat(product.selling_price) * 100).toFixed(2)
                  : '-'
                return (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td className="text-right">{parseFloat(product.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td className="text-right">
                      {product.selling_price ? parseFloat(product.selling_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽' : '-'}
                    </td>
                    <td className="text-right">{margin !== '-' ? margin + '%' : '-'}</td>
                    <td>{product.description || '-'}</td>
                    <td>
                      <button onClick={() => handleEdit(product)} style={{ marginRight: '4px' }}>Изменить</button>
                      <button onClick={() => handleDelete(product.id)} className="danger">Удалить</button>
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

export default Products

