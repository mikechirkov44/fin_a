import { useState, useEffect, useMemo } from 'react'
import { realizationService, referenceService, productsService } from '../services/api'
import { exportService } from '../services/exportService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import BulkActions from '../components/BulkActions'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import CompanySelectField from '../components/CompanySelectField'
import { useFormValidation } from '../hooks/useFormValidation'
import { useDebounce } from '../hooks/useDebounce'
import { useTableData, TableColumn } from '../hooks/useTableData'
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2'
import { useDraftSave } from '../hooks/useDraftSave'
import { format } from 'date-fns'
import { Button, Input, Select, SearchInput } from '../components/ui'

interface RealizationItem {
  product_id: string
  quantity: string
  price: string
  cost_price: string
}

const Realization = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  
  const validation = useFormValidation({
    date: { required: true },
    company_id: { required: true },
    sales_channel_id: { required: true },
  })
  const [realizations, setRealizations] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [salesChannels, setSalesChannels] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    company_id: selectedCompanyId || '',
    sales_channel_id: '',
    description: '',
    items: [] as RealizationItem[],
  })
  
  // Автосохранение черновика
  const { hasDraft, loadDraft, clearDraft } = useDraftSave(
    'realization-draft',
    showForm && !editingItem ? formData : null,
    showForm && !editingItem
  )

  useEffect(() => {
    loadData()
    loadSalesChannels()
    loadProducts()
  }, [])

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

  const loadProducts = async () => {
    try {
      const data = await productsService.getProducts()
      setProducts(data.filter((p: any) => p.is_active))
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const skip = (currentPage - 1) * itemsPerPage
      const response = await realizationService.getRealizations({
        skip,
        limit: itemsPerPage,
        company_id: filterCompanyId ? parseInt(filterCompanyId) : undefined,
      })
      
      // Поддержка старого формата (массив) и нового (объект с items)
      if (Array.isArray(response)) {
        setRealizations(response)
        setTotalCount(response.length)
      } else {
        setRealizations(response.items || [])
        setTotalCount(response.total || 0)
      }
    } catch (error) {
      console.error('Error loading realizations:', error)
      showError('Ошибка загрузки реализаций')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [currentPage, itemsPerPage, filterCompanyId])

  const getCompanyName = (id: number | null) => {
    if (!id) return '-'
    const company = companies.find(c => c.id === id)
    return company?.name || '-'
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
      key: 'sales_channel',
      label: 'Канал продаж',
      sortable: true,
      getValue: (item) => salesChannels.find(sc => sc.id === item.sales_channel_id)?.name || '',
    },
    {
      key: 'revenue',
      label: 'Сумма',
      sortable: true,
      getValue: (item) => parseFloat(item.revenue) || 0,
    },
    {
      key: 'quantity',
      label: 'Количество',
      sortable: true,
      getValue: (item) => parseInt(item.quantity) || 0,
    },
    {
      key: 'description',
      label: 'Описание',
      sortable: true,
      getValue: (item) => item.description || '',
    },
  ], [salesChannels, companies])

  // Фильтрация данных
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return realizations
    
    const query = debouncedSearchQuery.toLowerCase().trim()
    return realizations.filter((realization) => {
      const salesChannel = salesChannels.find(sc => sc.id === realization.sales_channel_id)
      const companyName = getCompanyName(realization.company_id)?.toLowerCase() || ''
      const itemsMatch = (realization.items || []).some((item: any) => {
        const productName = products.find(p => p.id === item.product_id)?.name?.toLowerCase() || ''
        return productName.includes(query)
      })
      return (
        realization.date?.toLowerCase().includes(query) ||
        salesChannel?.name?.toLowerCase().includes(query) ||
        companyName.includes(query) ||
        realization.revenue?.toString().includes(query) ||
        realization.quantity?.toString().includes(query) ||
        realization.description?.toLowerCase().includes(query) ||
        itemsMatch
      )
    })
  }, [realizations, debouncedSearchQuery, salesChannels, products, companies])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    if (!formData.items || formData.items.length === 0) {
      showError('Добавьте хотя бы один товар')
      return
    }
    
    // Валидация items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i]
      if (!item.product_id || !item.quantity || !item.price || !item.cost_price) {
        showError(`Заполните все поля в строке ${i + 1}`)
        return
      }
      if (parseInt(item.quantity) <= 0) {
        showError(`Количество должно быть больше 0 в строке ${i + 1}`)
        return
      }
      if (parseFloat(item.price) < 0 || parseFloat(item.cost_price) < 0) {
        showError(`Цены не могут быть отрицательными в строке ${i + 1}`)
        return
      }
    }
    
    try {
      const companyId = parseInt(String(formData.company_id))
      const salesChannelId = parseInt(String(formData.sales_channel_id))
      
      const submitData = {
        date: formData.date,
        company_id: companyId,
        sales_channel_id: salesChannelId,
        description: formData.description || null,
        items: formData.items.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          cost_price: parseFloat(item.cost_price),
        })),
      }
      if (editingItem) {
        await realizationService.updateRealization(editingItem.id, submitData)
      } else {
        await realizationService.createRealization(submitData)
      }
      handleClose()
      clearDraft()
      showSuccess(editingItem ? 'Реализация успешно обновлена' : 'Реализация успешно добавлена')
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
      sales_channel_id: '',
      description: '',
      items: [],
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: '1', price: '0', cost_price: '0' }],
    })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const updateItem = (index: number, field: keyof RealizationItem, value: string) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Автоматически подставляем себестоимость из товара при выборе
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product) {
        newItems[index].cost_price = product.cost_price?.toString() || '0'
        if (!newItems[index].price || newItems[index].price === '0') {
          newItems[index].price = product.selling_price?.toString() || '0'
        }
      }
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const calculateTotalRevenue = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)
    }, 0)
  }

  const calculateTotalQuantity = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (parseInt(item.quantity) || 0)
    }, 0)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingItem(null)
    resetForm()
    validation.clearAllErrors()
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      date: item.date,
      company_id: item.company_id?.toString() || selectedCompanyId || '',
      sales_channel_id: item.sales_channel_id?.toString() || '',
      description: item.description || '',
      items: (item.items || []).map((i: any) => ({
        product_id: i.product_id?.toString() || '',
        quantity: i.quantity?.toString() || '1',
        price: i.price?.toString() || '0',
        cost_price: i.cost_price?.toString() || '0',
      })),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: 'Вы уверены, что хотите удалить эту запись о реализации?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await realizationService.deleteRealization(id)
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
      await realizationService.deleteMultiple(ids)
      showSuccess(`Удалено ${ids.length} ${ids.length === 1 ? 'запись' : 'записей'}`)
      loadData()
      clearSelection()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка группового удаления')
    }
  }
  
  const handleBulkExport = () => {
    const selectedData = realizations.filter(r => selectedItems.has(r.id))
    // Здесь можно добавить экспорт выбранных записей
    exportService.exportRealizations({ format: 'xlsx', data: selectedData })
  }

  return (
    <div>
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingItem ? 'Редактировать реализацию' : 'Добавить реализацию'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField label="Дата" required error={validation.errors.date}>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value })
                  validation.clearError('date')
                }}
              />
            </FormField>
            <FormField label="Организация" required error={validation.errors.company_id}>
              <CompanySelectField
                value={formData.company_id}
                onChange={(value) => {
                  setFormData({ ...formData, company_id: value })
                  validation.clearError('company_id')
                }}
                placeholder="Выберите организацию..."
              />
            </FormField>
            <FormField label="Канал продаж" required error={validation.errors.sales_channel_id}>
              <Select
                value={formData.sales_channel_id}
                onChange={(e) => {
                  setFormData({ ...formData, sales_channel_id: e.target.value })
                  validation.clearError('sales_channel_id')
                }}
                placeholder="Выберите..."
                options={salesChannels.filter(sc => sc.is_active).map(channel => ({
                  value: channel.id,
                  label: channel.name
                }))}
              />
            </FormField>
          </div>
          <FormField label="Товары" required>
            <div style={{ marginBottom: '8px' }}>
              <Button type="button" variant="secondary" size="small" icon={<HiOutlinePlus />} onClick={addItem}>
                Добавить товар
              </Button>
            </div>
            {formData.items.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px dashed #ccc', borderRadius: '4px' }}>
                Нет товаров. Нажмите "Добавить товар" для начала.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}>Товар</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '100px' }}>Кол-во</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Цена</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Себест.</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Сумма</th>
                      <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px' }}>
                          <Select
                            value={item.product_id}
                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                            placeholder="Выберите..."
                            options={[
                              { value: '', label: 'Выберите...' },
                              ...products.map(product => ({
                                value: product.id.toString(),
                                label: product.name
                              }))
                            ]}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>
                          {(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => removeItem(index)}
                            icon={<HiOutlineTrash />}
                            title="Удалить"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #ccc', fontWeight: 'bold' }}>
                      <td colSpan={2} style={{ padding: '8px' }}>Итого:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {calculateTotalQuantity()}
                      </td>
                      <td style={{ padding: '8px' }}></td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {calculateTotalRevenue().toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </td>
                      <td style={{ padding: '8px' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </FormField>
          <FormField label="Описание">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" icon={<HiOutlinePlus />} onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }}>
              Добавить
            </Button>
            <Button variant="secondary" onClick={() => exportService.exportRealizations({ format: 'xlsx' })}>
              Экспорт Excel
            </Button>
            <Button variant="secondary" onClick={() => exportService.exportRealizations({ format: 'csv' })}>
              Экспорт CSV
            </Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Select
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              placeholder="Все организации"
              options={[
                { value: '', label: 'Все организации' },
                ...companies.filter(c => c.is_active).map(company => ({
                  value: company.id.toString(),
                  label: company.name
                }))
              ]}
              fullWidth={false}
              style={{ width: '180px' }}
            />
            <SearchInput
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              fullWidth={false}
              style={{ width: '200px' }}
            />
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
                      textAlign: col.key === 'revenue' || col.key === 'quantity' ? 'right' : 'left',
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
                    <LoadingSpinner message="Загрузка реализаций..." />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <EmptyState
                      icon="📊"
                      title="Нет реализаций"
                      message={debouncedSearchQuery ? 'Реализации не найдены по вашему запросу' : 'Добавьте первую реализацию, чтобы начать работу'}
                      action={!debouncedSearchQuery ? {
                        label: 'Добавить реализацию',
                        onClick: () => { setShowForm(true); setEditingItem(null); resetForm() }
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedData.map((realization) => (
                  <tr
                    key={realization.id}
                    className={`clickable ${selectedItems.has(realization.id) ? 'selected' : ''}`}
                    onClick={() => handleEdit(realization)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(realization.id)}
                        onChange={() => toggleSelect(realization.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{realization.date}</td>
                    <td>{getCompanyName(realization.company_id)}</td>
                    <td>{salesChannels.find(sc => sc.id === realization.sales_channel_id)?.name || '-'}</td>
                    <td 
                      className="text-right"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {parseFloat(realization.revenue).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </td>
                    <td className="text-right">
                      {realization.quantity}
                      {(realization.items && realization.items.length > 0) && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          ({realization.items.length} {realization.items.length === 1 ? 'товар' : 'товаров'})
                        </div>
                      )}
                    </td>
                    <td>{realization.description || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleDelete(realization.id)}
                        icon={<HiOutlineTrash />}
                        title="Удалить"
                      />
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

export default Realization

