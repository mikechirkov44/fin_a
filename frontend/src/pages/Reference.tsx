import { useState, useEffect } from 'react'
import { referenceService, productsService } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

type TabType = 'income' | 'expense' | 'payment' | 'company' | 'marketplace' | 'incomeGroup' | 'expenseGroup' | 'expenseCategory' | 'salesChannel' | 'product'

const Reference = () => {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState<TabType>('income')
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [paymentPlaces, setPaymentPlaces] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [marketplaces, setMarketplaces] = useState<any[]>([])
  const [incomeGroups, setIncomeGroups] = useState<any[]>([])
  const [expenseGroups, setExpenseGroups] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [salesChannels, setSalesChannels] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [allIncomeItems, setAllIncomeItems] = useState<any[]>([])
  const [allExpenseItems, setAllExpenseItems] = useState<any[]>([])
  const [allPaymentPlaces, setAllPaymentPlaces] = useState<any[]>([])
  const [allCompanies, setAllCompanies] = useState<any[]>([])
  const [allMarketplaces, setAllMarketplaces] = useState<any[]>([])
  const [allIncomeGroups, setAllIncomeGroups] = useState<any[]>([])
  const [allExpenseGroups, setAllExpenseGroups] = useState<any[]>([])
  const [allExpenseCategories, setAllExpenseCategories] = useState<any[]>([])
  const [allSalesChannels, setAllSalesChannels] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    group_id: null as number | null,
    parent_group_id: null as number | null,
    subgroup_type: null as string | null,
    sku: '',
    cost_price: '',
    selling_price: ''
  })

  useEffect(() => {
    loadData()
    if (activeTab === 'income' || activeTab === 'expense') {
      loadGroups()
    }
  }, [activeTab])

  const loadGroups = async () => {
    try {
      if (activeTab === 'income') {
        const groups = await referenceService.getIncomeGroups()
        setAllIncomeGroups(groups)
      } else if (activeTab === 'expense') {
        const groups = await referenceService.getExpenseGroups()
        setAllExpenseGroups(groups)
      }
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

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
      } else if (activeTab === 'incomeGroup') {
        const data = await referenceService.getIncomeGroups()
        setAllIncomeGroups(data)
        setIncomeGroups(data)
      } else if (activeTab === 'expenseGroup') {
        const data = await referenceService.getExpenseGroups()
        setAllExpenseGroups(data)
        setExpenseGroups(data)
      } else if (activeTab === 'expenseCategory') {
        const data = await referenceService.getExpenseCategories()
        setAllExpenseCategories(data)
        setExpenseCategories(data)
      } else if (activeTab === 'salesChannel') {
        const data = await referenceService.getSalesChannels()
        setAllSalesChannels(data)
        setSalesChannels(data)
      } else if (activeTab === 'product') {
        const data = await productsService.getProducts()
        setAllProducts(data)
        setProducts(data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  // Фильтрация и сортировка по поисковому запросу
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    let filtered: any[] = []
    
    // Получаем нужный массив данных
    if (activeTab === 'income') filtered = [...allIncomeItems]
    else if (activeTab === 'expense') filtered = [...allExpenseItems]
    else if (activeTab === 'payment') filtered = [...allPaymentPlaces]
    else if (activeTab === 'company') filtered = [...allCompanies]
    else if (activeTab === 'marketplace') filtered = [...allMarketplaces]
    else if (activeTab === 'incomeGroup') filtered = [...allIncomeGroups]
    else if (activeTab === 'expenseGroup') filtered = [...allExpenseGroups]
    else if (activeTab === 'expenseCategory') filtered = [...allExpenseCategories]
    else if (activeTab === 'salesChannel') filtered = [...allSalesChannels]
    else if (activeTab === 'product') filtered = [...allProducts]

    // Фильтрация
    if (query) {
      filtered = filtered.filter((item: any) => 
        item.name?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
      )
    }

    // Сортировка
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortColumn) {
          case 'name':
            aVal = a.name || ''
            bVal = b.name || ''
            break
          case 'description':
            aVal = a.description || ''
            bVal = b.description || ''
            break
          case 'group':
            if (activeTab === 'income' || activeTab === 'expense') {
              const groups = activeTab === 'income' ? allIncomeGroups : allExpenseGroups
              const aGroup = groups.find((g: any) => g.id === a.group_id)
              const bGroup = groups.find((g: any) => g.id === b.group_id)
              aVal = aGroup?.name || ''
              bVal = bGroup?.name || ''
            } else {
              return 0
            }
            break
          case 'parent_group':
            if (activeTab === 'incomeGroup' || activeTab === 'expenseGroup') {
              const groups = activeTab === 'incomeGroup' ? allIncomeGroups : allExpenseGroups
              const aParent = groups.find((g: any) => g.id === a.parent_group_id)
              const bParent = groups.find((g: any) => g.id === b.parent_group_id)
              aVal = aParent?.name || ''
              bVal = bParent?.name || ''
            } else {
              return 0
            }
            break
          case 'subgroup_type':
            aVal = a.subgroup_type || ''
            bVal = b.subgroup_type || ''
            break
          case 'sku':
            aVal = a.sku || ''
            bVal = b.sku || ''
            break
          case 'cost_price':
            aVal = parseFloat(String(a.cost_price)) || 0
            bVal = parseFloat(String(b.cost_price)) || 0
            break
          case 'selling_price':
            aVal = parseFloat(String(a.selling_price)) || 0
            bVal = parseFloat(String(b.selling_price)) || 0
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

    // Устанавливаем отфильтрованные и отсортированные данные
    if (activeTab === 'income') setIncomeItems(filtered)
    else if (activeTab === 'expense') setExpenseItems(filtered)
    else if (activeTab === 'payment') setPaymentPlaces(filtered)
    else if (activeTab === 'company') setCompanies(filtered)
    else if (activeTab === 'marketplace') setMarketplaces(filtered)
    else if (activeTab === 'incomeGroup') setIncomeGroups(filtered)
    else if (activeTab === 'expenseGroup') setExpenseGroups(filtered)
    else if (activeTab === 'expenseCategory') setExpenseCategories(filtered)
    else if (activeTab === 'salesChannel') setSalesChannels(filtered)
    else if (activeTab === 'product') setProducts(filtered)
  }, [searchQuery, activeTab, allIncomeItems, allExpenseItems, allPaymentPlaces, allCompanies, allMarketplaces, allIncomeGroups, allExpenseGroups, allExpenseCategories, allSalesChannels, allProducts, sortColumn, sortDirection, allIncomeGroups, allExpenseGroups])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData: any = { ...formData }
      if (!submitData.group_id) delete submitData.group_id
      if (!submitData.parent_group_id) delete submitData.parent_group_id
      if (!submitData.subgroup_type) delete submitData.subgroup_type
      
      // Для продуктов преобразуем строки в числа
      if (activeTab === 'product') {
        submitData.cost_price = parseFloat(submitData.cost_price) || 0
        submitData.selling_price = submitData.selling_price ? parseFloat(submitData.selling_price) : null
      } else {
        delete submitData.sku
        delete submitData.cost_price
        delete submitData.selling_price
      }
      
      // Для групп удаляем поля, которые не нужны
      if (activeTab === 'incomeGroup' || activeTab === 'expenseGroup') {
        delete submitData.group_id
      } else {
        delete submitData.parent_group_id
        delete submitData.subgroup_type
      }
      
      if (activeTab === 'income') {
        if (editingItem) {
          await referenceService.updateIncomeItem(editingItem.id, submitData)
        } else {
          await referenceService.createIncomeItem(submitData)
        }
      } else if (activeTab === 'expense') {
        if (editingItem) {
          await referenceService.updateExpenseItem(editingItem.id, submitData)
        } else {
          await referenceService.createExpenseItem(submitData)
        }
      } else if (activeTab === 'payment') {
        if (editingItem) {
          await referenceService.updatePaymentPlace(editingItem.id, submitData)
        } else {
          await referenceService.createPaymentPlace(submitData)
        }
      } else if (activeTab === 'company') {
        if (editingItem) {
          await referenceService.updateCompany(editingItem.id, submitData)
        } else {
          await referenceService.createCompany(submitData)
        }
      } else if (activeTab === 'marketplace') {
        if (editingItem) {
          await referenceService.updateMarketplace(editingItem.id, submitData)
        } else {
          await referenceService.createMarketplace(submitData)
        }
      } else if (activeTab === 'incomeGroup') {
        if (editingItem) {
          await referenceService.updateIncomeGroup(editingItem.id, submitData)
        } else {
          await referenceService.createIncomeGroup(submitData)
        }
      } else if (activeTab === 'expenseGroup') {
        if (editingItem) {
          await referenceService.updateExpenseGroup(editingItem.id, submitData)
        } else {
          await referenceService.createExpenseGroup(submitData)
        }
      } else if (activeTab === 'expenseCategory') {
        if (editingItem) {
          await referenceService.updateExpenseCategory(editingItem.id, submitData)
        } else {
          await referenceService.createExpenseCategory(submitData)
        }
      } else if (activeTab === 'salesChannel') {
        if (editingItem) {
          await referenceService.updateSalesChannel(editingItem.id, submitData)
        } else {
          await referenceService.createSalesChannel(submitData)
        }
      } else if (activeTab === 'product') {
        if (editingItem) {
          await productsService.updateProduct(editingItem.id, submitData)
        } else {
          await productsService.createProduct(submitData)
        }
      }
      setShowForm(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', group_id: null, parent_group_id: null, subgroup_type: null, sku: '', cost_price: '', selling_price: '' })
      loadData()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({ 
      name: item.name, 
      description: item.description || '', 
      group_id: item.group_id || null,
      parent_group_id: item.parent_group_id || null,
      subgroup_type: item.subgroup_type || null,
      sku: item.sku || '',
      cost_price: item.cost_price || '',
      selling_price: item.selling_price || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      if (activeTab === 'income') await referenceService.deleteIncomeItem(id)
      else if (activeTab === 'expense') await referenceService.deleteExpenseItem(id)
      else if (activeTab === 'payment') await referenceService.deletePaymentPlace(id)
      else if (activeTab === 'company') await referenceService.deleteCompany(id)
      else if (activeTab === 'marketplace') await referenceService.deleteMarketplace(id)
      else if (activeTab === 'incomeGroup') await referenceService.deleteIncomeGroup(id)
      else if (activeTab === 'expenseGroup') await referenceService.deleteExpenseGroup(id)
      else if (activeTab === 'expenseCategory') await referenceService.deleteExpenseCategory(id)
      else if (activeTab === 'salesChannel') await referenceService.deleteSalesChannel(id)
      else if (activeTab === 'product') await productsService.deleteProduct(id)
      showSuccess('Запись успешно удалена')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления записи')
    }
  }

  const getCurrentItems = () => {
    if (activeTab === 'income') return incomeItems
    if (activeTab === 'expense') return expenseItems
    if (activeTab === 'payment') return paymentPlaces
    if (activeTab === 'company') return companies
    if (activeTab === 'marketplace') return marketplaces
    if (activeTab === 'incomeGroup') return incomeGroups
    if (activeTab === 'expenseGroup') return expenseGroups
    if (activeTab === 'expenseCategory') return expenseCategories
    if (activeTab === 'salesChannel') return salesChannels
    if (activeTab === 'product') return products
    return []
  }

  const getTitle = () => {
    if (activeTab === 'income') return 'Статьи доходов'
    if (activeTab === 'expense') return 'Статьи расходов'
    if (activeTab === 'payment') return 'Места оплаты'
    if (activeTab === 'company') return 'Компании'
    if (activeTab === 'marketplace') return 'Маркетплейсы'
    if (activeTab === 'incomeGroup') return 'Группы статей доходов'
    if (activeTab === 'expenseGroup') return 'Группы статей расходов'
    if (activeTab === 'expenseCategory') return 'Категории расходов'
    if (activeTab === 'salesChannel') return 'Каналы продаж'
    if (activeTab === 'product') return 'Продукты'
    return ''
  }

  const currentItems = getCurrentItems()
  const title = getTitle()

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          onClick={() => { setActiveTab('income'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'income' ? 'primary' : ''}
        >
          Статьи доходов
        </button>
        <button
          onClick={() => { setActiveTab('incomeGroup'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'incomeGroup' ? 'primary' : ''}
        >
          Группы доходов
        </button>
        <button
          onClick={() => { setActiveTab('expense'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'expense' ? 'primary' : ''}
        >
          Статьи расходов
        </button>
        <button
          onClick={() => { setActiveTab('expenseGroup'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'expenseGroup' ? 'primary' : ''}
        >
          Группы расходов
        </button>
        <button
          onClick={() => { setActiveTab('expenseCategory'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'expenseCategory' ? 'primary' : ''}
        >
          Категории расходов
        </button>
        <button
          onClick={() => { setActiveTab('payment'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'payment' ? 'primary' : ''}
        >
          Места оплаты
        </button>
        <button
          onClick={() => { setActiveTab('company'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'company' ? 'primary' : ''}
        >
          Компании
        </button>
        <button
          onClick={() => { setActiveTab('marketplace'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'marketplace' ? 'primary' : ''}
        >
          Маркетплейсы
        </button>
        <button
          onClick={() => { setActiveTab('salesChannel'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'salesChannel' ? 'primary' : ''}
        >
          Каналы продаж
        </button>
        <button
          onClick={() => { setActiveTab('product'); setShowForm(false); setEditingItem(null) }}
          className={activeTab === 'product' ? 'primary' : ''}
        >
          Продукты
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
            {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && (
              <div className="form-group">
                <label>Родительская группа (для подгрупп)</label>
                <select
                  value={formData.parent_group_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_group_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Не выбрано (основная группа)</option>
                  {(activeTab === 'incomeGroup' ? allIncomeGroups : allExpenseGroups)
                    .filter((g: any) => !g.parent_group_id)
                    .map((group: any) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                </select>
              </div>
            )}
            {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && formData.parent_group_id && (
              <div className="form-group">
                <label>Тип подгруппы</label>
                <select
                  value={formData.subgroup_type || ''}
                  onChange={(e) => setFormData({ ...formData, subgroup_type: e.target.value || null })}
                >
                  <option value="">Не выбрано</option>
                  <option value="income">Поступления</option>
                  <option value="expense">Выбытия</option>
                </select>
              </div>
            )}
            {(activeTab === 'income' || activeTab === 'expense') && (
              <div className="form-group">
                <label>Группа/Подгруппа</label>
                <select
                  value={formData.group_id || ''}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Не выбрано</option>
                  {(activeTab === 'income' ? allIncomeGroups : allExpenseGroups).map((group: any) => (
                    <option key={group.id} value={group.id}>
                      {group.parent_group_id ? '  └ ' : ''}{group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {activeTab === 'product' && (
              <>
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
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
              </>
            )}
            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <button type="submit" className="primary mr-8">Сохранить</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setFormData({ name: '', description: '', group_id: null, parent_group_id: null, subgroup_type: null, sku: '', cost_price: '', selling_price: '' }) }}>
              Отмена
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">{title}</div>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ name: '', description: '', group_id: null, parent_group_id: null, subgroup_type: null, sku: '', cost_price: '', selling_price: '' }) }} className="primary">
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
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('name')}
              >
                Наименование {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              {(activeTab === 'income' || activeTab === 'expense') && (
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('group')}
                >
                  Группа/Подгруппа {sortColumn === 'group' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              )}
              {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && (
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('parent_group')}
                >
                  Родительская группа {sortColumn === 'parent_group' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              )}
              {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && (
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('subgroup_type')}
                >
                  Тип подгруппы {sortColumn === 'subgroup_type' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              )}
              {activeTab === 'product' && (
                <>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('sku')}
                  >
                    SKU {sortColumn === 'sku' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="text-right"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('cost_price')}
                  >
                    Себестоимость {sortColumn === 'cost_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="text-right"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('selling_price')}
                  >
                    Цена продажи {sortColumn === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                </>
              )}
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('description')}
              >
                Описание {sortColumn === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th style={{ width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={
                  activeTab === 'product' ? 6 :
                  (activeTab === 'income' || activeTab === 'expense') ? 4 :
                  (activeTab === 'incomeGroup' || activeTab === 'expenseGroup') ? 5 : 3
                } className="text-center">Нет данных</td>
              </tr>
            ) : (
              currentItems.map((item) => {
                const groupName = (activeTab === 'income' || activeTab === 'expense') && item.group_id
                  ? ((activeTab === 'income' ? allIncomeGroups : allExpenseGroups).find((g: any) => g.id === item.group_id)?.name || '-')
                  : null
                const parentGroupName = (activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && item.parent_group_id
                  ? ((activeTab === 'incomeGroup' ? allIncomeGroups : allExpenseGroups).find((g: any) => g.id === item.parent_group_id)?.name || '-')
                  : null
                return (
                  <tr key={item.id}>
                    <td>{item.parent_group_id ? '  └ ' : ''}{item.name}</td>
                    {(activeTab === 'income' || activeTab === 'expense') && <td>{groupName || '-'}</td>}
                    {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && <td>{parentGroupName || '-'}</td>}
                    {(activeTab === 'incomeGroup' || activeTab === 'expenseGroup') && (
                      <td>
                        {item.subgroup_type === 'income' ? 'Поступления' : 
                         item.subgroup_type === 'expense' ? 'Выбытия' : '-'}
                      </td>
                    )}
                    {activeTab === 'product' && (
                      <>
                        <td>{item.sku || '-'}</td>
                        <td className="text-right">{item.cost_price ? parseFloat(item.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '-'} {item.cost_price ? '₽' : ''}</td>
                        <td className="text-right">{item.selling_price ? parseFloat(item.selling_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : '-'} {item.selling_price ? '₽' : ''}</td>
                      </>
                    )}
                    <td>{item.description || '-'}</td>
                    <td>
                      <button onClick={() => handleEdit(item)} style={{ marginRight: '4px' }}>Изменить</button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
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

export default Reference

