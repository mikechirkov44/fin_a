import { useState, useEffect } from 'react'
import { input1Service, referenceService } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { format } from 'date-fns'

const Input1 = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const [movements, setMovements] = useState<any[]>([])
  const [allMovements, setAllMovements] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [paymentPlaces, setPaymentPlaces] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    movement_type: 'income',
    company_id: selectedCompanyId || '',
    income_item_id: '',
    expense_item_id: '',
    payment_place_id: '',
    description: '',
    is_business: true,
  })

  useEffect(() => {
    loadData()
    loadReferences()
  }, [])

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])

  const loadData = async () => {
    try {
      const data = await input1Service.getMovements({ limit: 1000 })
      setAllMovements(data)
    } catch (error) {
      console.error('Error loading movements:', error)
    }
  }

  const getItemName = (movement: any) => {
    if (movement.movement_type === 'income') {
      const item = incomeItems.find(i => i.id === movement.income_item_id)
      return item?.name || '-'
    } else {
      const item = expenseItems.find(i => i.id === movement.expense_item_id)
      return item?.name || '-'
    }
  }

  const getPaymentPlaceName = (id: number) => {
    const place = paymentPlaces.find(p => p.id === id)
    return place?.name || '-'
  }

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
  }

  // Фильтрация и сортировка
  useEffect(() => {
    let filtered = allMovements

    // Фильтрация по организации
    if (filterCompanyId) {
      const companyIdNum = parseInt(filterCompanyId)
      filtered = filtered.filter((movement) => movement.company_id === companyIdNum)
    }

    // Фильтрация по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((movement) => {
        const itemName = getItemName(movement)?.toLowerCase() || ''
        const paymentPlaceName = getPaymentPlaceName(movement.payment_place_id)?.toLowerCase() || ''
        const companyName = getCompanyName(movement.company_id)?.toLowerCase() || ''
        return (
          movement.date?.toLowerCase().includes(query) ||
          (movement.movement_type === 'income' ? 'поступление' : 'оплата').includes(query) ||
          itemName.includes(query) ||
          paymentPlaceName.includes(query) ||
          companyName.includes(query) ||
          movement.amount?.toString().includes(query) ||
          movement.description?.toLowerCase().includes(query) ||
          (movement.is_business ? 'да' : 'нет').includes(query)
        )
      })
    }

    // Сортировка данных
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortColumn) {
          case 'date':
            aVal = a.date || ''
            bVal = b.date || ''
            break
          case 'type':
            aVal = a.movement_type === 'income' ? 'поступление' : 'оплата'
            bVal = b.movement_type === 'income' ? 'поступление' : 'оплата'
            break
          case 'item':
            aVal = getItemName(a)
            bVal = getItemName(b)
            break
          case 'payment_place':
            aVal = getPaymentPlaceName(a.payment_place_id)
            bVal = getPaymentPlaceName(b.payment_place_id)
            break
          case 'amount':
            aVal = parseFloat(String(a.amount)) || 0
            bVal = parseFloat(String(b.amount)) || 0
            break
          case 'is_business':
            aVal = a.is_business ? 1 : 0
            bVal = b.is_business ? 1 : 0
            break
          case 'company':
            aVal = getCompanyName(a.company_id)
            bVal = getCompanyName(b.company_id)
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
    }

    setMovements(filtered)
  }, [searchQuery, filterCompanyId, allMovements, incomeItems, expenseItems, paymentPlaces, companies, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const loadReferences = async () => {
    try {
      const [income, expense, places] = await Promise.all([
        referenceService.getIncomeItems(),
        referenceService.getExpenseItems(),
        referenceService.getPaymentPlaces(),
      ])
      setIncomeItems(income)
      setExpenseItems(expense)
      setPaymentPlaces(places)
    } catch (error) {
      console.error('Error loading references:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        company_id: parseInt(String(formData.company_id)),
        income_item_id: formData.movement_type === 'income' ? parseInt(String(formData.income_item_id)) : null,
        expense_item_id: formData.movement_type === 'expense' ? parseInt(String(formData.expense_item_id)) : null,
        payment_place_id: parseInt(String(formData.payment_place_id)),
        is_business: formData.is_business,
      }
      if (editingItem) {
        await input1Service.updateMovement(editingItem.id, submitData)
      } else {
        await input1Service.createMovement(submitData)
      }
      setShowForm(false)
      setEditingItem(null)
      resetForm()
      showSuccess(editingItem ? 'Движение успешно обновлено' : 'Движение успешно добавлено')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      movement_type: 'income',
      company_id: selectedCompanyId || '',
      income_item_id: '',
      expense_item_id: '',
      payment_place_id: '',
      description: '',
      is_business: true,
    })
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      amount: item.amount.toString(),
      movement_type: item.movement_type,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      income_item_id: item.income_item_id?.toString() || '',
      expense_item_id: item.expense_item_id?.toString() || '',
      payment_place_id: item.payment_place_id.toString(),
      description: item.description || '',
      is_business: item.is_business,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить запись?')) return
    try {
      await input1Service.deleteMovement(id)
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  return (
    <div>
      {showForm && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">{editingItem ? 'Редактировать' : 'Добавить'} движение</div>
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
                <label>Тип *</label>
                <select
                  value={formData.movement_type}
                  onChange={(e) => setFormData({ ...formData, movement_type: e.target.value, income_item_id: '', expense_item_id: '' })}
                  required
                >
                  <option value="income">Поступление</option>
                  <option value="expense">Оплата</option>
                </select>
              </div>
              <div className="form-group">
                <label>Сумма *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              {formData.movement_type === 'income' ? (
                <div className="form-group">
                  <label>Статья дохода *</label>
                  <select
                    value={formData.income_item_id}
                    onChange={(e) => setFormData({ ...formData, income_item_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите...</option>
                    {incomeItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label>Статья расхода *</label>
                  <select
                    value={formData.expense_item_id}
                    onChange={(e) => setFormData({ ...formData, expense_item_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите...</option>
                    {expenseItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Место оплаты *</label>
                <select
                  value={formData.payment_place_id}
                  onChange={(e) => setFormData({ ...formData, payment_place_id: e.target.value })}
                  required
                >
                  <option value="">Выберите...</option>
                  {paymentPlaces.map(place => (
                    <option key={place.id} value={place.id}>{place.name}</option>
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
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_business}
                    onChange={(e) => setFormData({ ...formData, is_business: e.target.checked })}
                  />
                  {' '}Бизнес
                </label>
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
            <button onClick={() => exportService.exportMoneyMovements({ format: 'xlsx' })}>
              Экспорт Excel
            </button>
            <button onClick={() => exportService.exportMoneyMovements({ format: 'csv' })}>
              Экспорт CSV
            </button>
            <label style={{ display: 'inline-block' }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                id="import-file-input"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    try {
                      const result = await importService.importMoneyMovements(file)
                      showSuccess(result.message)
                      if (result.errors.length > 0) {
                        showError('Ошибки при импорте: ' + result.errors.join(', '))
                      }
                      loadData()
                    } catch (error: any) {
                      showError('Ошибка импорта: ' + (error.response?.data?.detail || error.message))
                    }
                  }
                  e.target.value = ''
                }}
                style={{ display: 'none' }}
              />
              <button type="button" onClick={() => document.getElementById('import-file-input')?.click()}>
                Импорт
              </button>
            </label>
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
                  handleSort('type')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Тип {sortColumn === 'type' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('item')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Статья {sortColumn === 'item' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('payment_place')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Место оплаты {sortColumn === 'payment_place' && (sortDirection === 'asc' ? '▲' : '▼')}
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
                className="text-right" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('amount')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Сумма {sortColumn === 'amount' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={(e) => {
                  e.stopPropagation()
                  handleSort('is_business')
                }} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Бизнес {sortColumn === 'is_business' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '100px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">Нет данных</td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr 
                  key={movement.id}
                  className="clickable"
                  onClick={() => handleEdit(movement)}
                >
                  <td>{movement.date}</td>
                  <td>{movement.movement_type === 'income' ? 'Поступление' : 'Оплата'}</td>
                  <td>{getItemName(movement)}</td>
                  <td>{getPaymentPlaceName(movement.payment_place_id)}</td>
                  <td>{getCompanyName(movement.company_id)}</td>
                  <td className="text-right">{parseFloat(movement.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                  <td>{movement.is_business ? 'Да' : 'Нет'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => handleDelete(movement.id)} 
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

export default Input1

