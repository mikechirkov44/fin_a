import { useState, useEffect } from 'react'
import { suppliersService } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import '../components/CompactForm.css'

const Suppliers = () => {
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const { selectedCompanyId, companies } = useAuth()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [allSuppliers, setAllSuppliers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [formData, setFormData] = useState({
    name: '',
    company_id: selectedCompanyId || 0,
    contact_person: '',
    phone: '',
    email: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    actual_address: '',
    bank_name: '',
    bank_account: '',
    correspondent_account: '',
    bik: '',
    description: '',
    rating: 0,
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
            company_id: selectedCompanyId || 0,
            contact_person: '',
            phone: '',
            email: '',
            inn: '',
            kpp: '',
            ogrn: '',
            legal_address: '',
            actual_address: '',
            bank_name: '',
            bank_account: '',
            correspondent_account: '',
            bik: '',
            description: '',
            rating: 0,
          })
          setShowForm(true)
        }
      },
      description: 'Создать нового поставщика'
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
      const data = await suppliersService.getSuppliers(params)
      setAllSuppliers(data)
      setSuppliers(data)
    } catch (error) {
      console.error('Error loading suppliers:', error)
      showError('Ошибка загрузки поставщиков')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtered = allSuppliers.filter(supplier => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          supplier.name?.toLowerCase().includes(query) ||
          supplier.contact_person?.toLowerCase().includes(query) ||
          supplier.phone?.toLowerCase().includes(query) ||
          supplier.email?.toLowerCase().includes(query)
        )
      }
      return true
    })
    setSuppliers(filtered)
    setCurrentPage(1)
  }, [searchQuery, allSuppliers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      showError('Введите название поставщика')
      return
    }

    try {
      // Подготавливаем данные для отправки
      let companyId: number | null = null
      
      // Преобразуем company_id в число
      if (formData.company_id !== null && formData.company_id !== undefined) {
        if (typeof formData.company_id === 'string') {
          const parsed = parseInt(formData.company_id)
          if (!isNaN(parsed) && parsed > 0) {
            companyId = parsed
          }
        } else if (typeof formData.company_id === 'number' && formData.company_id > 0) {
          companyId = formData.company_id
        }
      }
      
      // Если company_id не указан в форме или равен 0, используем selectedCompanyId
      if ((!companyId || companyId === 0) && selectedCompanyId) {
        companyId = selectedCompanyId
      }
      
      // Проверяем, что company_id валиден
      if (!companyId || companyId === 0 || isNaN(companyId)) {
        showError('Выберите организацию')
        return
      }

      const submitData: any = {
        name: formData.name,
        company_id: companyId,
        rating: formData.rating || 0
      }

      // Добавляем только заполненные поля
      if (formData.contact_person) submitData.contact_person = formData.contact_person
      if (formData.phone) submitData.phone = formData.phone
      if (formData.email) submitData.email = formData.email
      if (formData.inn) submitData.inn = formData.inn
      if (formData.kpp) submitData.kpp = formData.kpp
      if (formData.ogrn) submitData.ogrn = formData.ogrn
      if (formData.legal_address) submitData.legal_address = formData.legal_address
      if (formData.actual_address) submitData.actual_address = formData.actual_address
      if (formData.bank_name) submitData.bank_name = formData.bank_name
      if (formData.bank_account) submitData.bank_account = formData.bank_account
      if (formData.correspondent_account) submitData.correspondent_account = formData.correspondent_account
      if (formData.bik) submitData.bik = formData.bik
      if (formData.description) submitData.description = formData.description

      if (editingItem) {
        await suppliersService.updateSupplier(editingItem.id, submitData)
        showSuccess('Поставщик обновлен')
      } else {
        await suppliersService.createSupplier(submitData)
        showSuccess('Поставщик создан')
      }
      setShowForm(false)
      setEditingItem(null)
      loadData()
    } catch (error: any) {
      console.error('Error saving supplier:', error)
      console.error('Error details:', error.response?.data)
      showError(error.response?.data?.detail || 'Ошибка сохранения поставщика')
    }
  }

  const handleEdit = (supplier: any) => {
    setEditingItem(supplier)
    setFormData({
      name: supplier.name || '',
      company_id: supplier.company_id || selectedCompanyId || 0,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      inn: supplier.inn || '',
      kpp: supplier.kpp || '',
      ogrn: supplier.ogrn || '',
      legal_address: supplier.legal_address || '',
      actual_address: supplier.actual_address || '',
      bank_name: supplier.bank_name || '',
      bank_account: supplier.bank_account || '',
      correspondent_account: supplier.correspondent_account || '',
      bik: supplier.bik || '',
      description: supplier.description || '',
      rating: supplier.rating || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление поставщика',
      message: 'Вы уверены, что хотите удалить этого поставщика?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger'
    })

    if (confirmed) {
      try {
        await suppliersService.deleteSupplier(id)
        showSuccess('Поставщик удален')
        loadData()
      } catch (error: any) {
        console.error('Error deleting supplier:', error)
        showError(error.response?.data?.detail || 'Ошибка удаления поставщика')
      }
    }
  }

  const paginatedSuppliers = suppliers.slice(
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
            placeholder="Поиск поставщиков..."
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
              company_id: selectedCompanyId || 0,
              contact_person: '',
              phone: '',
              email: '',
              inn: '',
              kpp: '',
              ogrn: '',
              legal_address: '',
              actual_address: '',
              bank_name: '',
              bank_account: '',
              correspondent_account: '',
              bik: '',
              description: '',
              rating: 0,
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
          + Добавить поставщика
        </button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          icon="🚚"
          title="Нет поставщиков"
          message={searchQuery ? "По вашему запросу ничего не найдено" : "Добавьте первого поставщика"}
        />
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Контактное лицо</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Рейтинг</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.name}</td>
                    <td>{supplier.contact_person || '-'}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.email || '-'}</td>
                    <td>{supplier.rating ? `${supplier.rating}/5` : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(supplier)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--danger-color, #dc3545)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Удалить
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
            totalPages={Math.ceil(suppliers.length / itemsPerPage)}
            totalItems={suppliers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      <Modal
        isOpen={showForm}
        title={editingItem ? 'Редактирование поставщика' : 'Добавление поставщика'}
        onClose={() => {
          setShowForm(false)
          setEditingItem(null)
        }}
        maxWidth="550px"
      >
          <form onSubmit={handleSubmit} className="compact-form">
            <div className="compact-form-section">
              <div className="compact-form-section-title">Основная информация</div>
              <div className="compact-form-grid">
                <FormField label="Название" required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Организация" required>
                  <select
                    value={formData.company_id || selectedCompanyId || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : (selectedCompanyId || 0)
                      setFormData({ ...formData, company_id: value })
                    }}
                    required
                  >
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Контактное лицо">
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
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
                <FormField label="Рейтинг">
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                  />
                </FormField>
              </div>
            </div>

            <div className="compact-form-section">
              <div className="compact-form-section-title">Реквизиты</div>
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
                <FormField label="ОГРН">
                  <input
                    type="text"
                    value={formData.ogrn}
                    onChange={(e) => setFormData({ ...formData, ogrn: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="compact-form-grid full-width">
                <FormField label="Юридический адрес">
                  <textarea
                    value={formData.legal_address}
                    onChange={(e) => setFormData({ ...formData, legal_address: e.target.value })}
                    rows={2}
                  />
                </FormField>
                <FormField label="Фактический адрес">
                  <textarea
                    value={formData.actual_address}
                    onChange={(e) => setFormData({ ...formData, actual_address: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </div>
            </div>

            <div className="compact-form-section">
              <div className="compact-form-section-title">Банковские реквизиты</div>
              <div className="compact-form-grid">
                <FormField label="Банк">
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </FormField>
                <FormField label="БИК">
                  <input
                    type="text"
                    value={formData.bik}
                    onChange={(e) => setFormData({ ...formData, bik: e.target.value })}
                  />
                </FormField>
                <FormField label="Расчетный счет">
                  <input
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  />
                </FormField>
                <FormField label="Корреспондентский счет">
                  <input
                    type="text"
                    value={formData.correspondent_account}
                    onChange={(e) => setFormData({ ...formData, correspondent_account: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div className="compact-form-section">
              <div className="compact-form-grid full-width">
                <FormField label="Описание">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

export default Suppliers

