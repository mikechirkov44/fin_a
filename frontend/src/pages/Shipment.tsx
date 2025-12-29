import { useState, useEffect, useMemo } from 'react'
import { shipmentService, productsService, referenceService } from '../services/api'
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
import { useFormValidation } from '../hooks/useFormValidation'
import { useDebounce } from '../hooks/useDebounce'
import { useTableData, TableColumn } from '../hooks/useTableData'
import { useDraftSave } from '../hooks/useDraftSave'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { format } from 'date-fns'

const Shipment = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [shipments, setShipments] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [products, setProducts] = useState<any[]>([])
  const [salesChannels, setSalesChannels] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  const validation = useFormValidation({
    date: { required: true },
    company_id: { required: true },
    product_id: { required: true },
    sales_channel_id: { required: true },
    quantity: { required: true, min: 0 },
    cost_price: { required: true, min: 0 },
  })
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: selectedCompanyId || '',
    product_id: '',
    sales_channel_id: '',
    quantity: '',
    cost_price: '',
    description: '',
  })
  
  // Автосохранение черновика
  const { hasDraft, loadDraft, clearDraft } = useDraftSave(
    'shipment-draft',
    showForm && !editingItem ? formData : null,
    showForm && !editingItem
  )

  useEffect(() => {
    loadProducts()
    loadSalesChannels()
  }, [])
  
  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage, filterCompanyId])

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

  const loadSalesChannels = async () => {
    try {
      const data = await referenceService.getSalesChannels()
      setSalesChannels(data)
    } catch (error) {
      console.error('Error loading sales channels:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * itemsPerPage
      const response = await shipmentService.getShipments({
        skip,
        limit: itemsPerPage,
        company_id: filterCompanyId ? parseInt(filterCompanyId) : undefined,
      })
      
      // Поддержка старого формата (массив) и нового (объект с items)
      if (Array.isArray(response)) {
        setShipments(response)
        setTotalCount(response.length)
      } else {
        setShipments(response.items || [])
        setTotalCount(response.total || 0)
      }
    } catch (error) {
      console.error('Error loading shipments:', error)
      showError('Ошибка загрузки отгрузок')
    } finally {
      setLoading(false)
    }
  }

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
  }

  const getProductName = (id: number | null) => {
    if (!id) return '-'
    const product = products.find(p => p.id === id)
    return product?.name || '-'
  }

  // Определение колонок для таблицы
  const columns: TableColumn<any>[] = useMemo(() => [
    { key: 'date', label: 'Дата', sortable: true },
    {
      key: 'company',
      label: 'Организация',
      sortable: true,
      getValue: (item) => getCompanyName(item.company_id),
    },
    {
      key: 'product',
      label: 'Товар',
      sortable: true,
      getValue: (item) => getProductName(item.product_id),
    },
    {
      key: 'sales_channel',
      label: 'Канал продаж',
      sortable: true,
      getValue: (item) => salesChannels.find(sc => sc.id === item.sales_channel_id)?.name || '',
    },
    {
      key: 'quantity',
      label: 'Количество',
      sortable: true,
      getValue: (item) => parseInt(String(item.quantity)) || 0,
    },
    {
      key: 'cost_price',
      label: 'Себестоимость (ед.)',
      sortable: true,
      getValue: (item) => parseFloat(String(item.cost_price)) || 0,
    },
    {
      key: 'total',
      label: 'Итого',
      sortable: true,
      getValue: (item) => parseFloat(String(item.cost_price)) * (parseInt(String(item.quantity)) || 0),
    },
    {
      key: 'description',
      label: 'Описание',
      sortable: true,
      getValue: (item) => item.description || '',
    },
  ], [salesChannels, companies, products])

  // Фильтрация данных
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return shipments
    
    const query = debouncedSearchQuery.toLowerCase().trim()
    return shipments.filter((shipment) => {
      const productName = getProductName(shipment.product_id)?.toLowerCase() || ''
      const salesChannel = salesChannels.find(sc => sc.id === shipment.sales_channel_id)
      const companyName = getCompanyName(shipment.company_id)?.toLowerCase() || ''
      return (
        shipment.date?.toLowerCase().includes(query) ||
        productName.includes(query) ||
        salesChannel?.name?.toLowerCase().includes(query) ||
        companyName.includes(query) ||
        shipment.quantity?.toString().includes(query) ||
        shipment.cost_price?.toString().includes(query) ||
        shipment.description?.toLowerCase().includes(query)
      )
    })
  }, [shipments, debouncedSearchQuery, salesChannels, products, companies])

  // Использование хука useTableData
  const {
    paginatedData,
    sortColumn,
    sortDirection,
    handleSort,
    selectedItems,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  } = useTableData({
    data: filteredData,
    columns,
    searchFields: ['date', 'description'],
    searchValue: debouncedSearchQuery,
    enablePagination: false, // Пагинация на backend
  })

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
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      const companyId = parseInt(String(formData.company_id))
      const salesChannelId = parseInt(String(formData.sales_channel_id))
      
      const submitData = {
        date: formData.date,
        company_id: companyId,
        product_id: formData.product_id ? parseInt(String(formData.product_id)) : null,
        sales_channel_id: salesChannelId,
        quantity: parseInt(String(formData.quantity)),
        cost_price: parseFloat(String(formData.cost_price)),
        description: formData.description || null,
      }
      if (editingItem) {
        await shipmentService.updateShipment(editingItem.id, submitData)
      } else {
        await shipmentService.createShipment(submitData)
      }
      handleClose()
      clearDraft()
      showSuccess(editingItem ? 'Отгрузка успешно обновлена' : 'Отгрузка успешно добавлена')
      loadData()
      clearSelection()
    } catch (error: any) {
      console.error('Error saving:', error)
      showError(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      company_id: selectedCompanyId || '',
      product_id: '',
      sales_channel_id: '',
      quantity: '',
      cost_price: '',
      description: '',
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
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      product_id: item.product_id?.toString() || '',
      sales_channel_id: item.sales_channel_id?.toString() || '',
      quantity: item.quantity.toString(),
      cost_price: item.cost_price.toString(),
      description: item.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись об отгрузке?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await shipmentService.deleteShipment(id)
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
      await shipmentService.deleteMultiple(ids)
      showSuccess(`Удалено ${ids.length} ${ids.length === 1 ? 'запись' : 'записей'}`)
      loadData()
      clearSelection()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка группового удаления')
    }
  }
  
  const handleBulkExport = () => {
    const selectedData = shipments.filter(s => selectedItems.has(s.id))
    exportService.exportShipments({ format: 'xlsx', data: selectedData })
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
      description: 'Создать новую отгрузку',
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
        title={editingItem ? 'Редактировать отгрузку' : 'Добавить отгрузку'}
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
              <FormField label="Товар" error={validation.errors.product_id}>
                <select
                  value={formData.product_id}
                  onChange={(e) => {
                    setFormData({ ...formData, product_id: e.target.value })
                    validation.clearError('product_id')
                  }}
                >
                  <option value="">Не указан</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>{product.name}</option>
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
              <FormField label="Канал продаж" required error={validation.errors.sales_channel_id}>
                <select
                  value={formData.sales_channel_id}
                  onChange={(e) => {
                    setFormData({ ...formData, sales_channel_id: e.target.value })
                    validation.clearError('sales_channel_id')
                  }}
                >
                  <option value="">Выберите...</option>
                  {salesChannels.filter(sc => sc.is_active).map(channel => (
                    <option key={channel.id} value={channel.id}>{channel.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Количество" required error={validation.errors.quantity}>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => {
                    setFormData({ ...formData, quantity: e.target.value })
                    validation.clearError('quantity')
                  }}
                />
              </FormField>
              <FormField label="Себестоимость (за единицу)" required error={validation.errors.cost_price}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => {
                    setFormData({ ...formData, cost_price: e.target.value })
                    validation.clearError('cost_price')
                  }}
                />
              </FormField>
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
            <Tooltip content="Создать новую отгрузку (Ctrl+N)">
              <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
                Добавить
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в Excel">
              <button onClick={() => exportService.exportShipments({ format: 'xlsx' })}>
                Экспорт Excel
              </button>
            </Tooltip>
            <Tooltip content="Импортировать из файла">
              <label style={{ display: 'inline-block' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="import-file-input-shipment"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      try {
                        const result = await importService.importShipments(file)
                        showSuccess(result.message)
                        if (result.errors && result.errors.length > 0) {
                          showError(`Ошибки при импорте: ${result.errors.slice(0, 5).join(', ')}${result.errors.length > 5 ? '...' : ''}`)
                        }
                        loadData()
                      } catch (error: any) {
                        showError(`Ошибка импорта: ${error.response?.data?.detail || error.message}`)
                      }
                    }
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => document.getElementById('import-file-input-shipment')?.click()}>
                  Импорт
                </button>
              </label>
            </Tooltip>
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
                      textAlign: col.key === 'quantity' || col.key === 'cost_price' || col.key === 'total' ? 'right' : 'left',
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
                    <LoadingSpinner message="Загрузка отгрузок..." />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <EmptyState
                      icon="📦"
                      title="Нет отгрузок"
                      message={debouncedSearchQuery ? 'Отгрузки не найдены по вашему запросу' : 'Добавьте первую отгрузку, чтобы начать работу'}
                      action={!debouncedSearchQuery ? {
                        label: 'Добавить отгрузку',
                        onClick: () => { setShowForm(true); setEditingItem(null); resetForm() }
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((shipment) => {
                  const total = parseFloat(shipment.cost_price) * shipment.quantity
                  return (
                    <tr
                      key={shipment.id}
                      className={`clickable ${selectedItems.has(shipment.id) ? 'selected' : ''}`}
                      onClick={() => handleEdit(shipment)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(shipment.id)}
                          onChange={() => toggleSelect(shipment.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{shipment.date}</td>
                      <td>{getCompanyName(shipment.company_id)}</td>
                      <td>{getProductName(shipment.product_id)}</td>
                      <td>{salesChannels.find(sc => sc.id === shipment.sales_channel_id)?.name || '-'}</td>
                      <td className="text-right">{shipment.quantity}</td>
                      <td className="text-right">{parseFloat(shipment.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      <td className="text-right">{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      <td>{shipment.description || '-'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Tooltip content="Удалить отгрузку">
                          <button
                            onClick={() => handleDelete(shipment.id)}
                            className="danger"
                            style={{ padding: '4px 6px', fontSize: '16px', lineHeight: '1', minWidth: 'auto' }}
                          >✕</button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })
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

export default Shipment

