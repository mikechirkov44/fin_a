import { useState, useEffect, useMemo } from 'react'
import { input1Service, referenceService } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import BulkActions from '../components/BulkActions'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import { useFormValidation } from '../hooks/useFormValidation'
import { useDebounce } from '../hooks/useDebounce'
import { useTableData, TableColumn } from '../hooks/useTableData'
import { useDraftSave } from '../hooks/useDraftSave'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { format } from 'date-fns'

const Input1 = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [movements, setMovements] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [paymentPlaces, setPaymentPlaces] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const validation = useFormValidation({
    date: { required: true },
    amount: { required: true, min: 0 },
    company_id: { required: true },
    payment_place_id: { required: true },
    income_item_id: { 
      custom: (value) => {
        if (formData.movement_type === 'income' && !value) {
          return 'Выберите статью дохода'
        }
        return null
      }
    },
    expense_item_id: {
      custom: (value) => {
        if (formData.movement_type === 'expense' && !value) {
          return 'Выберите статью расхода'
        }
        return null
      }
    },
  })
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
  
  // Автосохранение черновика
  const { hasDraft, loadDraft, clearDraft } = useDraftSave(
    'input1-draft',
    showForm && !editingItem ? formData : null,
    showForm && !editingItem
  )

  useEffect(() => {
    loadReferences()
  }, [])
  
  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage])

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])
  
  // Восстановление черновика при открытии формы
  useEffect(() => {
    if (showForm && !editingItem && hasDraft) {
      const draft = loadDraft()
      if (draft) {
        setFormData(draft)
      }
    }
  }, [showForm, editingItem, hasDraft])

  const loadData = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * itemsPerPage
      const params: any = {
        skip,
        limit: itemsPerPage,
      }
      
      if (filterCompanyId) {
        params.company_id = parseInt(filterCompanyId)
      }
      
      const response = await input1Service.getMovements(params)
      
      // Поддержка старого формата (массив) и нового (объект с items)
      if (Array.isArray(response)) {
        setMovements(response)
        setTotalCount(response.length)
      } else {
        setMovements(response.items || [])
        setTotalCount(response.total || 0)
      }
    } catch (error) {
      console.error('Error loading movements:', error)
      showError('Ошибка загрузки движений')
    } finally {
      setLoading(false)
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

  // Определение колонок для таблицы
  const columns: TableColumn<any>[] = useMemo(() => [
    { key: 'date', label: 'Дата', sortable: true },
    { key: 'type', label: 'Тип', sortable: true },
    {
      key: 'company',
      label: 'Организация',
      sortable: true,
      getValue: (item) => getCompanyName(item.company_id),
    },
    {
      key: 'item',
      label: 'Статья',
      sortable: true,
      getValue: (item) => getItemName(item),
    },
    {
      key: 'payment_place',
      label: 'Место оплаты',
      sortable: true,
      getValue: (item) => getPaymentPlaceName(item.payment_place_id),
    },
    {
      key: 'amount',
      label: 'Сумма',
      sortable: true,
      getValue: (item) => parseFloat(String(item.amount)) || 0,
    },
    {
      key: 'is_business',
      label: 'Бизнес',
      sortable: true,
      getValue: (item) => item.is_business ? 1 : 0,
    },
    {
      key: 'description',
      label: 'Описание',
      sortable: true,
      getValue: (item) => item.description || '',
    },
  ], [incomeItems, expenseItems, paymentPlaces, companies])

  // Перезагрузка данных при изменении фильтров или поиска
  useEffect(() => {
    setCurrentPage(1) // Сбрасываем на первую страницу при изменении фильтров
    loadData()
  }, [debouncedSearchQuery, filterCompanyId])

  // Клиентская сортировка загруженных данных
  const sortedMovements = useMemo(() => {
    if (!sortColumn) return movements
    
    return [...movements].sort((a, b) => {
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
  }, [movements, sortColumn, sortDirection, incomeItems, expenseItems, paymentPlaces, companies])

  // Использование хука useTableData для выбора элементов
  const {
    selectedItems,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useTableData({
    data: sortedMovements,
    columns,
    enablePagination: false, // Пагинация на backend
  })

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Данные для отображения (отсортированные)
  const paginatedData = sortedMovements

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
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
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
      handleClose()
      clearDraft()
      showSuccess(editingItem ? 'Движение успешно обновлено' : 'Движение успешно добавлено')
      loadData()
      clearSelection()
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
    validation.clearAllErrors()
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingItem(null)
    resetForm()
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
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись о движении денег?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await input1Service.deleteMovement(id)
      showSuccess('Запись успешно удалена')
      loadData()
      clearSelection()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления записи')
    }
  }
  
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedItems).map(id => Number(id))
    if (ids.length === 0) return
    
    try {
      await input1Service.deleteMultiple(ids)
      showSuccess(`Удалено ${ids.length} ${ids.length === 1 ? 'запись' : 'записей'}`)
      loadData()
      clearSelection()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка группового удаления')
    }
  }
  
  const handleBulkExport = () => {
    const selectedData = movements.filter(m => selectedItems.has(m.id))
    exportService.exportMoneyMovements({ format: 'xlsx', data: selectedData })
  }

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (!showForm) {
          setShowForm(true)
          setEditingItem(null)
          resetForm()
        }
      },
      description: 'Создать новое движение',
    },
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          handleClose()
        }
      },
      description: 'Закрыть форму',
    },
  ])


  return (
    <div>
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingItem ? 'Редактировать движение' : 'Добавить движение'}
        maxWidth="900px"
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
              <FormField label="Тип" required>
                <select
                  value={formData.movement_type}
                  onChange={(e) => {
                    setFormData({ ...formData, movement_type: e.target.value, income_item_id: '', expense_item_id: '' })
                    validation.clearError('income_item_id')
                    validation.clearError('expense_item_id')
                  }}
                >
                  <option value="income">Поступление</option>
                  <option value="expense">Оплата</option>
                </select>
              </FormField>
              <FormField label="Сумма" required error={validation.errors.amount}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value })
                    validation.clearError('amount')
                  }}
                />
              </FormField>
            </div>
            <div className="form-row">
              {formData.movement_type === 'income' ? (
                <FormField label="Статья дохода" required error={validation.errors.income_item_id}>
                  <select
                    value={formData.income_item_id}
                    onChange={(e) => {
                      setFormData({ ...formData, income_item_id: e.target.value })
                      validation.clearError('income_item_id')
                    }}
                  >
                    <option value="">Выберите...</option>
                    {incomeItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <FormField label="Статья расхода" required error={validation.errors.expense_item_id}>
                  <select
                    value={formData.expense_item_id}
                    onChange={(e) => {
                      setFormData({ ...formData, expense_item_id: e.target.value })
                      validation.clearError('expense_item_id')
                    }}
                  >
                    <option value="">Выберите...</option>
                    {expenseItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </FormField>
              )}
              <FormField label="Место оплаты" required error={validation.errors.payment_place_id}>
                <select
                  value={formData.payment_place_id}
                  onChange={(e) => {
                    setFormData({ ...formData, payment_place_id: e.target.value })
                    validation.clearError('payment_place_id')
                  }}
                >
                  <option value="">Выберите...</option>
                  {paymentPlaces.map(place => (
                    <option key={place.id} value={place.id}>{place.name}</option>
                  ))}
                </select>
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
            <Tooltip content="Создать новое движение (Ctrl+N)">
              <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
                Добавить
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в Excel">
              <button onClick={() => exportService.exportMoneyMovements({ format: 'xlsx' })}>
                Экспорт Excel
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в CSV">
              <button onClick={() => exportService.exportMoneyMovements({ format: 'csv' })}>
                Экспорт CSV
              </button>
            </Tooltip>
            <Tooltip content="Импортировать из файла">
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
            </Tooltip>
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
        {selectedItems.size > 0 && (
          <BulkActions
            selectedCount={selectedItems.size}
            onDelete={handleBulkDelete}
            onExport={handleBulkExport}
          />
        )}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected
                    }}
                    onChange={toggleSelectAll}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    style={{
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      textAlign: col.key === 'amount' ? 'right' : 'left',
                    }}
                  >
                    {col.label} {sortColumn === col.key && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                ))}
                <th style={{ width: '100px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <LoadingSpinner message="Загрузка движений..." />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <EmptyState
                      icon="💰"
                      title="Нет движений"
                      message={debouncedSearchQuery ? 'Движения не найдены по вашему запросу' : 'Добавьте первое движение, чтобы начать работу'}
                      action={!debouncedSearchQuery ? {
                        label: 'Добавить движение',
                        onClick: () => { setShowForm(true); setEditingItem(null); resetForm() }
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((movement) => (
                  <tr
                    key={movement.id}
                    className={`clickable ${selectedItems.has(movement.id) ? 'selected' : ''}`}
                    onClick={() => handleEdit(movement)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(movement.id)}
                        onChange={() => toggleSelect(movement.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>{movement.date}</td>
                    <td>{movement.movement_type === 'income' ? 'Поступление' : 'Оплата'}</td>
                    <td>{getCompanyName(movement.company_id)}</td>
                    <td>{getItemName(movement)}</td>
                    <td>{getPaymentPlaceName(movement.payment_place_id)}</td>
                    <td className="text-right">{parseFloat(movement.amount).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td>{movement.is_business ? 'Да' : 'Нет'}</td>
                    <td>{movement.description || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Удалить движение">
                        <button
                          onClick={() => handleDelete(movement.id)}
                          className="danger"
                          style={{ padding: '4px 6px', fontSize: '16px', lineHeight: '1', minWidth: 'auto' }}
                        >✕</button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalCount > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage)
              setCurrentPage(1)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Input1

