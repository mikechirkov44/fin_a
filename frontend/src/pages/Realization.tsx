import { useState, useEffect } from 'react'
import { realizationService, referenceService } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useCompany } from '../contexts/CompanyContext'
import { format } from 'date-fns'

const Realization = () => {
  const { selectedCompanyId, companies } = useCompany()
  const [realizations, setRealizations] = useState<any[]>([])
  const [allRealizations, setAllRealizations] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
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
    revenue: '',
    quantity: '',
    description: '',
  })

  useEffect(() => {
    loadData()
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
        return (
          realization.date?.toLowerCase().includes(query) ||
          marketplace?.name?.toLowerCase().includes(query) ||
          companyName.includes(query) ||
          realization.revenue?.toString().includes(query) ||
          realization.quantity?.toString().includes(query) ||
          realization.description?.toLowerCase().includes(query)
        )
      })
    }

    const sorted = sortData(filtered, sortColumn, sortDirection)
    setRealizations(sorted)
  }, [searchQuery, filterCompanyId, allRealizations, marketplaces, companies, sortColumn, sortDirection])

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
        marketplace_id: marketplaceId,
        revenue: parseFloat(String(formData.revenue)),
        quantity: parseInt(String(formData.quantity)) || 0,
        description: formData.description || null,
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
    } catch (error: any) {
      console.error('Error saving:', error)
      alert(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      company_id: selectedCompanyId || '',
      marketplace_id: '',
      revenue: '',
      quantity: '',
      description: '',
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      marketplace_id: item.marketplace_id?.toString() || '',
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
                  <td className="text-right">{realization.quantity}</td>
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

