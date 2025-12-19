import { useState, useEffect } from 'react'
import { realizationService } from '../services/api'
import { exportService } from '../services/exportService'
import { format } from 'date-fns'

const Realization = () => {
  const [realizations, setRealizations] = useState<any[]>([])
  const [allRealizations, setAllRealizations] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    marketplace: '',
    revenue: '',
    quantity: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const data = await realizationService.getRealizations({ limit: 1000 })
      setAllRealizations(data)
      setRealizations(data)
    } catch (error) {
      console.error('Error loading realizations:', error)
    }
  }

  // Фильтрация по поисковому запросу
  useEffect(() => {
    if (!searchQuery.trim()) {
      setRealizations(allRealizations)
      return
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = allRealizations.filter((realization) => {
      return (
        realization.date?.toLowerCase().includes(query) ||
        realization.marketplace?.toLowerCase().includes(query) ||
        realization.revenue?.toString().includes(query) ||
        realization.quantity?.toString().includes(query) ||
        realization.description?.toLowerCase().includes(query)
      )
    })
    setRealizations(filtered)
  }, [searchQuery, allRealizations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        revenue: parseFloat(formData.revenue),
        quantity: parseInt(formData.quantity) || 0,
      }
      if (editingItem) {
        await realizationService.updateRealization(editingItem.id, submitData)
      } else {
        await realizationService.createRealization(submitData)
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
      marketplace: '',
      revenue: '',
      quantity: '',
      description: '',
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      marketplace: item.marketplace,
      revenue: item.revenue.toString(),
      quantity: item.quantity.toString(),
      description: item.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      await realizationService.deleteRealization(id)
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  return (
    <div>
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} реализацию</div>
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
                <label>Маркетплейс *</label>
                <select
                  value={formData.marketplace}
                  onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  <option value="ozon">Ozon</option>
                  <option value="wb">Wildberries</option>
                  <option value="yandex">Яндекс.Маркет</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div className="form-group">
                <label>Выручка *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Количество</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
              <th>Маркетплейс</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">Количество</th>
              <th>Описание</th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {realizations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">Нет данных</td>
              </tr>
            ) : (
              realizations.map((realization) => (
                <tr key={realization.id}>
                  <td>{realization.date}</td>
                  <td>{realization.marketplace}</td>
                  <td className="text-right">{parseFloat(realization.revenue).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                  <td className="text-right">{realization.quantity}</td>
                  <td>{realization.description || '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(realization)} style={{ marginRight: '4px' }}>Изменить</button>
                    <button onClick={() => handleDelete(realization.id)} className="danger">Удалить</button>
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

