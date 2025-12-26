import { useState, useEffect } from 'react'
import { input2Service } from '../services/api'
import { useCompany } from '../contexts/CompanyContext'
import { format } from 'date-fns'

const Input2 = () => {
  const { selectedCompanyId, companies } = useCompany()
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets')
  const [assets, setAssets] = useState<any[]>([])
  const [liabilities, setLiabilities] = useState<any[]>([])
  const [allAssets, setAllAssets] = useState<any[]>([])
  const [allLiabilities, setAllLiabilities] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    value: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: selectedCompanyId || '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === 'assets') {
        const data = await input2Service.getAssets({ limit: 1000 })
        setAllAssets(data)
        setAssets(data)
      } else {
        const data = await input2Service.getLiabilities({ limit: 1000 })
        setAllLiabilities(data)
        setLiabilities(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
  }

  // Фильтрация по поисковому запросу и организации
  useEffect(() => {
    let filtered: any[] = []
    
    if (activeTab === 'assets') {
      filtered = [...allAssets]
    } else {
      filtered = [...allLiabilities]
    }

    // Фильтрация по организации
    if (filterCompanyId) {
      const companyIdNum = parseInt(filterCompanyId)
      filtered = filtered.filter((item) => item.company_id === companyIdNum)
    }

    // Фильтрация по поисковому запросу
    const query = searchQuery.toLowerCase().trim()
    if (query) {
      filtered = filtered.filter((item) => {
        const companyName = getCompanyName(item.company_id)?.toLowerCase() || ''
        return (
          item.name?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.value?.toString().includes(query) ||
          item.date?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          companyName.includes(query)
        )
      })
    }

    if (activeTab === 'assets') {
      setAssets(filtered)
    } else {
      setLiabilities(filtered)
    }
  }, [searchQuery, filterCompanyId, activeTab, allAssets, allLiabilities, companies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        company_id: parseInt(formData.company_id),
        value: parseFloat(formData.value),
      }
      if (activeTab === 'assets') {
        if (editingItem) {
          await input2Service.updateAsset(editingItem.id, submitData)
        } else {
          await input2Service.createAsset(submitData)
        }
      } else {
        if (editingItem) {
          await input2Service.updateLiability(editingItem.id, submitData)
        } else {
          await input2Service.createLiability(submitData)
        }
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
      name: '',
      category: '',
      value: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      company_id: selectedCompanyId || '',
      description: '',
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      value: item.value.toString(),
      date: item.date,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      description: item.description || '',
    })
    setShowForm(true)
  }

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      if (activeTab === 'assets') {
        await input2Service.deleteAsset(id)
      } else {
        await input2Service.deleteLiability(id)
      }
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const currentItems = activeTab === 'assets' ? assets : liabilities
  const title = activeTab === 'assets' ? 'Активы' : 'Обязательства'
  const categories = activeTab === 'assets'
    ? [
        { value: 'current', label: 'Оборотные' },
        { value: 'fixed', label: 'Основные средства' },
        { value: 'intangible', label: 'Нематериальные' },
      ]
    : [
        { value: 'short_term', label: 'Краткосрочные' },
        { value: 'long_term', label: 'Долгосрочные' },
      ]

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => { setActiveTab('assets'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'assets' ? 'primary' : ''}
          style={{ marginRight: '8px' }}
        >
          Активы
        </button>
        <button
          onClick={() => { setActiveTab('liabilities'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'liabilities' ? 'primary' : ''}
        >
          Обязательства
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} {title}</div>
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
                <label>Категория *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Стоимость *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>
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
        <div className="card-header">{title}</div>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
            Добавить
          </button>
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
              <th>Дата</th>
              <th>Наименование</th>
              <th>Категория</th>
              <th>Организация</th>
              <th className="text-right">Стоимость</th>
              <th>Описание</th>
              <th style={{ width: '100px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">Нет данных</td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr 
                  key={item.id}
                  className="clickable"
                  onClick={() => handleEdit(item)}
                >
                  <td>{item.date}</td>
                  <td>{item.name}</td>
                  <td>{categories.find(c => c.value === item.category)?.label || item.category}</td>
                  <td>{getCompanyName(item.company_id)}</td>
                  <td className="text-right">{parseFloat(item.value).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                  <td>{item.description || '-'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDelete(item.id)} 
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

export default Input2

