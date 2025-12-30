import { useState, useEffect } from 'react'
import { productsService } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import Tooltip from '../components/Tooltip'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { HiOutlineXMark } from 'react-icons/hi2'

const Products = () => {
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [products, setProducts] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    description: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await productsService.getProducts()
      setAllProducts(data)
      setProducts(data)
    } catch (error) {
      console.error('Error loading products:', error)
      showError('Ошибка загрузки товаров')
    } finally {
      setLoading(false)
    }
  }

  // Сортировка данных
  const sortData = (data: any[], column: string | null, direction: 'asc' | 'desc') => {
    if (!column) return data

    const sorted = [...data].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (column) {
        case 'name':
          aVal = a.name || ''
          bVal = b.name || ''
          break
        case 'sku':
          aVal = a.sku || ''
          bVal = b.sku || ''
          break
        case 'cost_price':
          aVal = parseFloat(a.cost_price) || 0
          bVal = parseFloat(b.cost_price) || 0
          break
        case 'selling_price':
          aVal = a.selling_price ? parseFloat(a.selling_price) : 0
          bVal = b.selling_price ? parseFloat(b.selling_price) : 0
          break
        case 'margin':
          const aMargin = a.selling_price 
            ? ((parseFloat(a.selling_price) - parseFloat(a.cost_price)) / parseFloat(a.selling_price) * 100)
            : 0
          const bMargin = b.selling_price 
            ? ((parseFloat(b.selling_price) - parseFloat(b.cost_price)) / parseFloat(b.selling_price) * 100)
            : 0
          aVal = aMargin
          bVal = bMargin
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
    let filtered = allProducts

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = allProducts.filter((product) => {
        return (
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.cost_price?.toString().includes(query) ||
          product.selling_price?.toString().includes(query)
        )
      })
    }

    const sorted = sortData(filtered, sortColumn, sortDirection)
    setProducts(sorted)
  }, [searchQuery, allProducts, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Переключаем направление сортировки
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Устанавливаем новый столбец и направление по умолчанию
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Наименование обязательно для заполнения'
    }
    
    if (!formData.sku.trim()) {
      errors.sku = 'Артикул обязателен для заполнения'
    }
    
    const costPrice = parseFloat(formData.cost_price)
    if (!formData.cost_price || isNaN(costPrice) || costPrice < 0) {
      errors.cost_price = 'Введите корректную себестоимость (больше или равно 0)'
    }
    
    if (formData.selling_price) {
      const sellingPrice = parseFloat(formData.selling_price)
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        errors.selling_price = 'Введите корректную цену продажи (больше или равно 0)'
      }
      if (sellingPrice < costPrice) {
        errors.selling_price = 'Цена продажи не может быть меньше себестоимости'
      }
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      const submitData = {
        ...formData,
        cost_price: parseFloat(formData.cost_price),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
      }
      if (editingItem) {
        await productsService.updateProduct(editingItem.id, submitData)
        showSuccess('Товар успешно обновлен')
      } else {
        await productsService.createProduct(submitData)
        showSuccess('Товар успешно добавлен')
      }
      handleClose()
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка сохранения')
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
    setFormErrors({})
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingItem(null)
    resetForm()
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
    const confirmed = await confirm({
      title: 'Удаление товара',
      message: 'Вы уверены, что хотите удалить этот товар?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await productsService.deleteProduct(id)
      showSuccess('Товар успешно удален')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления товара')
    }
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
      description: 'Создать новый товар',
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

  // Пагинация
  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = products.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  return (
    <div>
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingItem ? 'Редактировать товар' : 'Добавить товар'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <FormField label="Наименование" required error={formErrors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (formErrors.name) {
                    setFormErrors({ ...formErrors, name: '' })
                  }
                }}
              />
            </FormField>
            <FormField label="Артикул (SKU)" required error={formErrors.sku}>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value })
                  if (formErrors.sku) {
                    setFormErrors({ ...formErrors, sku: '' })
                  }
                }}
              />
            </FormField>
          </div>
          <div className="form-row">
            <FormField label="Себестоимость" required error={formErrors.cost_price}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => {
                  setFormData({ ...formData, cost_price: e.target.value })
                  if (formErrors.cost_price) {
                    setFormErrors({ ...formErrors, cost_price: '' })
                  }
                }}
              />
            </FormField>
            <FormField label="Цена продажи" error={formErrors.selling_price}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.selling_price}
                onChange={(e) => {
                  setFormData({ ...formData, selling_price: e.target.value })
                  if (formErrors.selling_price) {
                    setFormErrors({ ...formErrors, selling_price: '' })
                  }
                }}
              />
            </FormField>
          </div>
          <FormField label="Описание">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
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
            <Tooltip content="Создать новый товар (Ctrl+N)">
              <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm(); setFormErrors({}) }} className="primary">
                Добавить
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в Excel">
              <button onClick={() => exportService.exportProducts({ format: 'xlsx' })}>
                Экспорт Excel
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в CSV">
              <button onClick={() => exportService.exportProducts({ format: 'csv' })}>
                Экспорт CSV
              </button>
            </Tooltip>
            <Tooltip content="Импортировать из файла">
              <label style={{ display: 'inline-block' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="import-file-input-products"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      try {
                        const result = await importService.importProducts(file)
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
                <button type="button" onClick={() => document.getElementById('import-file-input-products')?.click()}>
                  Импорт
                </button>
              </label>
            </Tooltip>
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
              <th 
                onClick={() => handleSort('name')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Наименование {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                onClick={() => handleSort('sku')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Артикул {sortColumn === 'sku' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={() => handleSort('cost_price')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Себестоимость {sortColumn === 'cost_price' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={() => handleSort('selling_price')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Цена продажи {sortColumn === 'selling_price' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                onClick={() => handleSort('margin')} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Маржа {sortColumn === 'margin' && (sortDirection === 'asc' ? '▲' : '▼')}
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
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <LoadingSpinner message="Загрузка товаров..." />
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="📦"
                    title="Нет товаров"
                    message={searchQuery ? 'Товары не найдены по вашему запросу' : 'Добавьте первый товар, чтобы начать работу'}
                    action={!searchQuery ? {
                      label: 'Добавить товар',
                      onClick: () => { setShowForm(true); setEditingItem(null); resetForm(); setFormErrors({}) }
                    } : undefined}
                  />
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const margin = product.selling_price
                  ? ((parseFloat(product.selling_price) - parseFloat(product.cost_price)) / parseFloat(product.selling_price) * 100).toFixed(2)
                  : '-'
                return (
                  <tr 
                    key={product.id}
                    className="clickable"
                    onClick={() => handleEdit(product)}
                  >
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td className="text-right">{parseFloat(product.cost_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    <td className="text-right">
                      {product.selling_price ? parseFloat(product.selling_price).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + ' ₽' : '-'}
                    </td>
                    <td className="text-right">{margin !== '-' ? margin + '%' : '-'}</td>
                    <td>{product.description || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Tooltip content="Удалить товар">
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="action-button action-button-compact action-button-delete"
                        >
                          <HiOutlineXMark />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        {!loading && products.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={products.length}
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

export default Products

