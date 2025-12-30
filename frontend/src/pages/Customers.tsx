import { useState, useEffect } from 'react'
import { customersService } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { HiOutlinePencil, HiOutlineXMark } from 'react-icons/hi2'
import '../components/CompactForm.css'

const Customers = () => {
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const { selectedCompanyId, companies } = useAuth()
  const [customers, setCustomers] = useState<any[]>([])
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [formData, setFormData] = useState({
    name: '',
    company_id: selectedCompanyId || '',
    type: 'individual',
    phone: '',
    email: '',
    address: '',
    inn: '',
    kpp: '',
    legal_name: '',
    segment_id: '',
    notes: '',
  })

  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (!showForm) {
          setEditingItem(null)
          setFormData({
            name: '',
            company_id: selectedCompanyId || '',
            type: 'individual',
            phone: '',
            email: '',
            address: '',
            inn: '',
            kpp: '',
            legal_name: '',
            segment_id: '',
            notes: '',
          })
          setShowForm(true)
        }
      },
      description: 'Создать нового клиента'
    },
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          setShowForm(false)
          setEditingItem(null)
        }
      }
    }
  ])

  useEffect(() => {
    loadData()
    loadSegments()
  }, [selectedCompanyId])

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])

  const loadData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      const data = await customersService.getCustomers(params)
      setAllCustomers(data)
      setCustomers(data)
    } catch (error) {
      console.error('Error loading customers:', error)
      showError('Ошибка загрузки клиентов')
    } finally {
      setLoading(false)
    }
  }

  const loadSegments = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await customersService.getSegments(params)
      setSegments(data)
    } catch (error) {
      console.error('Error loading segments:', error)
    }
  }

  useEffect(() => {
    const filtered = allCustomers.filter(customer => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          customer.name?.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query)
        )
      }
      return true
    })
    setCustomers(filtered)
    setCurrentPage(1)
  }, [searchQuery, allCustomers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showError('Введите имя клиента')
      return
    }

    // Проверяем и преобразуем company_id
    const companyId = formData.company_id 
      ? (typeof formData.company_id === 'string' ? parseInt(formData.company_id) : formData.company_id)
      : selectedCompanyId
    
    if (!companyId) {
      showError('Выберите организацию')
      return
    }

    try {
      const submitData: any = {
        name: formData.name.trim(),
        company_id: companyId,
        type: formData.type || 'individual',
      }

      // Добавляем только заполненные поля
      if (formData.phone) submitData.phone = formData.phone
      if (formData.email) submitData.email = formData.email
      if (formData.address) submitData.address = formData.address
      if (formData.inn) submitData.inn = formData.inn
      if (formData.kpp) submitData.kpp = formData.kpp
      if (formData.legal_name) submitData.legal_name = formData.legal_name
      if (formData.segment_id) submitData.segment_id = parseInt(formData.segment_id)
      if (formData.notes) submitData.notes = formData.notes

      if (editingItem) {
        await customersService.updateCustomer(editingItem.id, submitData)
        showSuccess('Клиент обновлен')
      } else {
        await customersService.createCustomer(submitData)
        showSuccess('Клиент создан')
      }
      setShowForm(false)
      setEditingItem(null)
      loadData()
    } catch (error: any) {
      console.error('Error saving customer:', error)
      showError(error.response?.data?.detail || 'Ошибка сохранения клиента')
    }
  }

  const handleEdit = (customer: any) => {
    setEditingItem(customer)
    setFormData({
      name: customer.name || '',
      company_id: customer.company_id || selectedCompanyId || '',
      type: customer.type || 'individual',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      inn: customer.inn || '',
      kpp: customer.kpp || '',
      legal_name: customer.legal_name || '',
      segment_id: customer.segment_id || '',
      notes: customer.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление клиента',
      message: 'Вы уверены, что хотите удалить этого клиента?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await customersService.deleteCustomer(id)
        showSuccess('Клиент удален')
        loadData()
      } catch (error: any) {
        console.error('Error deleting customer:', error)
        showError(error.response?.data?.detail || 'Ошибка удаления клиента')
      }
    }
  }

  const handleUpdateMetrics = async (id: number) => {
    try {
      await customersService.updateCustomerMetrics(id)
      showSuccess('Метрики обновлены')
      loadData()
    } catch (error: any) {
      console.error('Error updating metrics:', error)
      showError(error.response?.data?.detail || 'Ошибка обновления метрик')
    }
  }

  const paginatedCustomers = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <input
            type="text"
            placeholder="Поиск клиентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--input-border)',
              borderRadius: '4px',
              fontSize: '14px',
              flex: 1,
              maxWidth: '400px'
            }}
          />
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({
              name: '',
              company_id: selectedCompanyId || '',
              type: 'individual',
              phone: '',
              email: '',
              address: '',
              inn: '',
              kpp: '',
              legal_name: '',
              segment_id: '',
              notes: '',
            })
            setShowForm(true)
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Добавить клиента
        </button>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Нет клиентов"
          message={searchQuery ? "По вашему запросу ничего не найдено" : "Добавьте первого клиента"}
        />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Покупок</th>
                  <th>Сумма покупок</th>
                  <th>Средний чек</th>
                  <th>LTV</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.purchase_count || 0}</td>
                    <td>{customer.total_purchases ? `${parseFloat(customer.total_purchases).toLocaleString('ru-RU')} ₽` : '0 ₽'}</td>
                    <td>{customer.average_check ? `${parseFloat(customer.average_check).toLocaleString('ru-RU')} ₽` : '-'}</td>
                    <td>{customer.ltv ? `${parseFloat(customer.ltv).toLocaleString('ru-RU')} ₽` : '-'}</td>
                    <td>
                      <div className="action-buttons-group">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="action-button action-button-compact action-button-edit"
                          title="Редактировать"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          onClick={() => handleUpdateMetrics(customer.id)}
                          className="action-button action-button-compact action-button-update"
                          title="Обновить метрики"
                        >
                          ↻
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="action-button action-button-compact action-button-delete"
                          title="Удалить"
                        >
                          <HiOutlineXMark />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(customers.length / itemsPerPage)}
            totalItems={customers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      <Modal
        isOpen={showForm}
        title={editingItem ? 'Редактирование клиента' : 'Добавление клиента'}
        onClose={() => {
          setShowForm(false)
          setEditingItem(null)
        }}
        maxWidth="500px"
      >
          <form onSubmit={handleSubmit} className="compact-form">
            <div className="compact-form-section">
              <div className="compact-form-section-title">Основная информация</div>
              <div className="compact-form-grid">
                <FormField label="Имя" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Организация">
                  <select
                    value={formData.company_id}
                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  >
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Тип">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="individual">Физическое лицо</option>
                    <option value="company">Юридическое лицо</option>
                  </select>
                </FormField>
                <FormField label="Сегмент">
                  <select
                    value={formData.segment_id}
                    onChange={(e) => setFormData({ ...formData, segment_id: e.target.value })}
                  >
                    <option value="">Не выбран</option>
                    {segments.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Телефон">
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </FormField>
                <FormField label="Email">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="compact-form-grid full-width">
                <FormField label="Адрес">
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </div>
            </div>

            {formData.type === 'company' && (
              <div className="compact-form-section">
                <div className="compact-form-section-title">Реквизиты юридического лица</div>
                <div className="compact-form-grid">
                  <FormField label="ИНН">
                    <input
                      type="text"
                      value={formData.inn}
                      onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                    />
                  </FormField>
                  <FormField label="КПП">
                    <input
                      type="text"
                      value={formData.kpp}
                      onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="compact-form-grid full-width">
                  <FormField label="Юридическое название">
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="compact-form-section">
              <div className="compact-form-grid full-width">
                <FormField label="Заметки">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </div>
            </div>

            <div className="compact-form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingItem(null)
                }}
                className="compact-form-button-cancel"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="compact-form-button-submit"
              >
                Сохранить
              </button>
            </div>
          </form>
        </Modal>
    </div>
  )
}

export default Customers

