import { useState, useEffect } from 'react'
import { referenceService } from '../services/api'

const Reference = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'payment' | 'company' | 'marketplace'>('income')
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [paymentPlaces, setPaymentPlaces] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
  const [allIncomeItems, setAllIncomeItems] = useState<any[]>([])
  const [allExpenseItems, setAllExpenseItems] = useState<any[]>([])
  const [allPaymentPlaces, setAllPaymentPlaces] = useState<any[]>([])
  const [allCompanies, setAllCompanies] = useState<any[]>([])
  const [allMarketplaces, setAllMarketplaces] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === 'income') {
        const data = await referenceService.getIncomeItems()
        setAllIncomeItems(data)
        setIncomeItems(data)
      } else if (activeTab === 'expense') {
        const data = await referenceService.getExpenseItems()
        setAllExpenseItems(data)
        setExpenseItems(data)
      } else if (activeTab === 'payment') {
        const data = await referenceService.getPaymentPlaces()
        setAllPaymentPlaces(data)
        setPaymentPlaces(data)
      } else if (activeTab === 'company') {
        const data = await referenceService.getCompanies()
        setAllCompanies(data)
        setCompanies(data)
      } else if (activeTab === 'marketplace') {
        const data = await referenceService.getMarketplaces()
        setAllMarketplaces(data)
        setMarketplaces(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // Фильтрация по поисковому запросу
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    
    if (!query) {
      if (activeTab === 'income') {
        setIncomeItems(allIncomeItems)
      } else if (activeTab === 'expense') {
        setExpenseItems(allExpenseItems)
      } else if (activeTab === 'payment') {
        setPaymentPlaces(allPaymentPlaces)
      } else if (activeTab === 'company') {
        setCompanies(allCompanies)
      } else if (activeTab === 'marketplace') {
        setMarketplaces(allMarketplaces)
      }
      return
    }

    if (activeTab === 'income') {
      const filtered = allIncomeItems.filter((item) => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
      setIncomeItems(filtered)
    } else if (activeTab === 'expense') {
      const filtered = allExpenseItems.filter((item) => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
      setExpenseItems(filtered)
    } else if (activeTab === 'payment') {
      const filtered = allPaymentPlaces.filter((item) => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
      setPaymentPlaces(filtered)
    } else if (activeTab === 'company') {
      const filtered = allCompanies.filter((item) => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
      setCompanies(filtered)
    } else if (activeTab === 'marketplace') {
      const filtered = allMarketplaces.filter((item) => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
      setMarketplaces(filtered)
    }
  }, [searchQuery, activeTab, allIncomeItems, allExpenseItems, allPaymentPlaces, allCompanies, allMarketplaces])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (activeTab === 'income') {
        if (editingItem) {
          await referenceService.updateIncomeItem(editingItem.id, formData)
        } else {
          await referenceService.createIncomeItem(formData)
        }
      } else if (activeTab === 'expense') {
        if (editingItem) {
          await referenceService.updateExpenseItem(editingItem.id, formData)
        } else {
          await referenceService.createExpenseItem(formData)
        }
      } else if (activeTab === 'payment') {
        if (editingItem) {
          await referenceService.updatePaymentPlace(editingItem.id, formData)
        } else {
          await referenceService.createPaymentPlace(formData)
        }
      } else if (activeTab === 'company') {
        if (editingItem) {
          await referenceService.updateCompany(editingItem.id, formData)
        } else {
          await referenceService.createCompany(formData)
        }
      } else if (activeTab === 'marketplace') {
        if (editingItem) {
          await referenceService.updateMarketplace(editingItem.id, formData)
        } else {
          await referenceService.createMarketplace(formData)
        }
      }
      setShowForm(false)
      setEditingItem(null)
      setFormData({ name: '', description: '' })
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({ name: item.name, description: item.description || '' })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      if (activeTab === 'income') {
        await referenceService.deleteIncomeItem(id)
      } else if (activeTab === 'expense') {
        await referenceService.deleteExpenseItem(id)
      } else if (activeTab === 'payment') {
        await referenceService.deletePaymentPlace(id)
      } else if (activeTab === 'company') {
        await referenceService.deleteCompany(id)
      } else if (activeTab === 'marketplace') {
        await referenceService.deleteMarketplace(id)
      }
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const getCurrentItems = () => {
    if (activeTab === 'income') return incomeItems
    if (activeTab === 'expense') return expenseItems
    if (activeTab === 'payment') return paymentPlaces
    if (activeTab === 'company') return companies
    if (activeTab === 'marketplace') return marketplaces
    return []
  }

  const getTitle = () => {
    if (activeTab === 'income') return 'Статьи доходов'
    if (activeTab === 'expense') return 'Статьи расходов'
    if (activeTab === 'payment') return 'Места оплаты'
    if (activeTab === 'company') return 'Компании'
    if (activeTab === 'marketplace') return 'Маркетплейсы'
    return ''
  }

  const currentItems = getCurrentItems()
  const title = getTitle()

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => { setActiveTab('income'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'income' ? 'primary' : ''}
          style={{ marginRight: '8px' }}
        >
          Статьи доходов
        </button>
        <button
          onClick={() => { setActiveTab('expense'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'expense' ? 'primary' : ''}
          style={{ marginRight: '8px' }}
        >
          Статьи расходов
        </button>
        <button
          onClick={() => { setActiveTab('payment'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'payment' ? 'primary' : ''}
          style={{ marginRight: '8px' }}
        >
          Места оплаты
        </button>
        <button
          onClick={() => { setActiveTab('company'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'company' ? 'primary' : ''}
          style={{ marginRight: '8px' }}
        >
          Компании
        </button>
        <button
          onClick={() => { setActiveTab('marketplace'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'marketplace' ? 'primary' : ''}
        >
          Маркетплейсы
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} {title}</div>
          <form onSubmit={handleSubmit}>
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
              <label>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <button type="submit" className="primary mr-8">Сохранить</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ name: '', description: '' }) }}>
              Отмена
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">{title}</div>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ name: '', description: '' }) }} className="primary">
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
              <th>Наименование</th>
              <th>Описание</th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center">Нет данных</td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.description || '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} style={{ marginRight: '4px' }}>Изменить</button>
                    <button onClick={() => handleDelete(item.id)} className="danger">Удалить</button>
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

export default Reference

