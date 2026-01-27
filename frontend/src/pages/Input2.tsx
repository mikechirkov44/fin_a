import { useState, useEffect } from 'react'
import { input2Service } from '../services/api'
import { exportService, importService } from '../services/exportService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import CompanySelectField from '../components/CompanySelectField'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { format } from 'date-fns'
import { HiOutlineTrash } from 'react-icons/hi2'

const Input2 = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets')
  const [assets, setAssets] = useState<any[]>([])
  const [liabilities, setLiabilities] = useState<any[]>([])
  const [allAssets, setAllAssets] = useState<any[]>([])
  const [allLiabilities, setAllLiabilities] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  
  const validation = useFormValidation({
    name: { required: true },
    category: { required: true },
    value: { required: true, min: 0 },
    date: { required: true },
    company_id: { required: true },
  })
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
      setLoading(true)
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
      showError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
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
          case 'name':
            aVal = a.name || ''
            bVal = b.name || ''
            break
          case 'category':
            aVal = categories.find(c => c.value === a.category)?.label || a.category
            bVal = categories.find(c => c.value === b.category)?.label || b.category
            break
          case 'company':
            aVal = getCompanyName(a.company_id)
            bVal = getCompanyName(b.company_id)
            break
          case 'value':
            aVal = parseFloat(String(a.value)) || 0
            bVal = parseFloat(String(b.value)) || 0
            break
          case 'description':
            aVal = a.description || ''
            bVal = b.description || ''
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

    if (activeTab === 'assets') {
      setAssets(filtered)
    } else {
      setLiabilities(filtered)
    }
  }, [searchQuery, filterCompanyId, activeTab, allAssets, allLiabilities, companies, sortColumn, sortDirection])

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
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      const submitData = {
        ...formData,
        company_id: parseInt(String(formData.company_id)),
        value: parseFloat(String(formData.value)),
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
      handleClose()
      showSuccess(editingItem ? `${title} успешно обновлен` : `${title} успешно добавлен`)
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка сохранения')
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
    const confirmed = await confirm({
      title: 'Удаление записи',
      message: `Вы уверены, что хотите удалить эту запись о ${activeTab === 'assets' ? 'активе' : 'обязательстве'}?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      if (activeTab === 'assets') {
        await input2Service.deleteAsset(id)
      } else {
        await input2Service.deleteLiability(id)
      }
      showSuccess('Запись успешно удалена')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления записи')
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
      description: 'Создать новую запись',
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
  const currentItems = activeTab === 'assets' ? assets : liabilities
  const totalPages = Math.ceil(currentItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = currentItems.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const title = activeTab === 'assets' ? 'Активы' : 'Обязательства'
  const categories = activeTab === 'assets'
    ? [
        { value: 'current', label: 'Оборотные' },
        { value: 'receivable', label: 'Дебиторская задолженность' },
        { value: 'fixed', label: 'Основные средства' },
        { value: 'intangible', label: 'Нематериальные' },
      ]
    : [
        { value: 'short_term', label: 'Краткосрочные' },
        { value: 'payable', label: 'Кредиторская задолженность' },
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

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingItem ? `Редактировать ${title}` : `Добавить ${title}`}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit}>
            <div className="form-row">
              <FormField label="Наименование" required error={validation.errors.name}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    validation.clearError('name')
                  }}
                />
              </FormField>
              <FormField label="Категория" required error={validation.errors.category}>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value })
                    validation.clearError('category')
                  }}
                >
                  <option value="">Выберите...</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Стоимость" required error={validation.errors.value}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => {
                    setFormData({ ...formData, value: e.target.value })
                    validation.clearError('value')
                  }}
                />
              </FormField>
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
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
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
        <div className="card-header">{title}</div>
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Tooltip content="Создать новую запись (Ctrl+N)">
              <button onClick={() => { setShowForm(true); setEditingItem(null); resetForm() }} className="primary">
                Добавить
              </button>
            </Tooltip>
            <Tooltip content="Экспортировать в Excel">
              <button 
                onClick={() => activeTab === 'assets' 
                  ? exportService.exportAssets({ format: 'xlsx' })
                  : exportService.exportLiabilities({ format: 'xlsx' })
                }
                style={{ fontSize: '13px' }}
              >
                Экспорт Excel
              </button>
            </Tooltip>
            <Tooltip content="Импортировать из файла">
              <label style={{ display: 'inline-block' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="import-file-input-input2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      try {
                        const result = activeTab === 'assets'
                          ? await importService.importAssets(file)
                          : await importService.importLiabilities(file)
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
                <button type="button" onClick={() => document.getElementById('import-file-input-input2')?.click()}>
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
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('date')}
                >
                  Дата {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('name')}
              >
                Наименование {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('category')}
              >
                Категория {sortColumn === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('company')}
              >
                Организация {sortColumn === 'company' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                className="text-right" 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('value')}
              >
                Стоимость {sortColumn === 'value' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th 
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('description')}
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
                    <LoadingSpinner message={`Загрузка ${title.toLowerCase()}...`} />
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={activeTab === 'assets' ? '💼' : '📋'}
                      title={`Нет ${title.toLowerCase()}`}
                      message={searchQuery ? `${title} не найдены по вашему запросу` : `Добавьте первый ${activeTab === 'assets' ? 'актив' : 'обязательство'}, чтобы начать работу`}
                      action={!searchQuery ? {
                        label: `Добавить ${activeTab === 'assets' ? 'актив' : 'обязательство'}`,
                        onClick: () => { setShowForm(true); setEditingItem(null); resetForm() }
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
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
                      <Tooltip content="Удалить запись">
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="action-button action-button-compact action-button-delete"
                        >
                          <HiOutlineTrash />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && currentItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={currentItems.length}
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

export default Input2

