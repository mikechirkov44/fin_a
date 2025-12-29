import { useState, useEffect } from 'react'
import { warehousesService, referenceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

const Warehouses = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    company_id: selectedCompanyId || 0,
  })
  
  const validation = useFormValidation({
    name: { required: true },
    company_id: { required: true, custom: (value) => value === 0 ? 'Выберите организацию' : null },
  })

  useEffect(() => {
    loadData()
    loadCompanies()
  }, [selectedCompanyId])

  const loadData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await warehousesService.getWarehouses(params)
      setWarehouses(data)
    } catch (error) {
      console.error('Error loading warehouses:', error)
      showError('Ошибка загрузки складов')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      const data = await referenceService.getCompanies()
      setCompanies(data.filter((c: any) => c.is_active))
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      if (editingWarehouse) {
        await warehousesService.updateWarehouse(editingWarehouse.id, formData)
      } else {
        await warehousesService.createWarehouse(formData)
      }
      setShowForm(false)
      setEditingWarehouse(null)
      setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId || 0 })
      validation.clearAllErrors()
      showSuccess(editingWarehouse ? 'Склад успешно обновлен' : 'Склад успешно добавлен')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при сохранении склада')
    }
  }

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse)
    setFormData({
      name: warehouse.name,
      address: warehouse.address || '',
      description: warehouse.description || '',
      company_id: warehouse.company_id,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление склада',
      message: 'Вы уверены, что хотите удалить этот склад?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await warehousesService.deleteWarehouse(id)
      showSuccess('Склад успешно удален')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления склада')
    }
  }

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (!showForm && selectedCompanyId && canWrite(selectedCompanyId)) {
          setShowForm(true)
          setEditingWarehouse(null)
          setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId })
        }
      },
      description: 'Создать новый склад',
    },
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          setShowForm(false)
          setEditingWarehouse(null)
          setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId || 0 })
        }
      },
      description: 'Закрыть форму',
    },
  ])

  const canEdit = (warehouse: any) => {
    return canWrite(warehouse.company_id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление складами</h2>
        {selectedCompanyId && canWrite(selectedCompanyId) && (
          <Tooltip content="Создать новый склад (Ctrl+N)">
            <button onClick={() => { 
              setShowForm(true)
              setEditingWarehouse(null)
              setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId })
              validation.clearAllErrors()
            }}>
              Добавить склад
            </button>
          </Tooltip>
        )}
      </div>

      {!selectedCompanyId && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#fff3cd' }}>
          Выберите организацию для просмотра складов
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            {editingWarehouse ? 'Редактировать склад' : 'Добавить склад'}
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <FormField label="Название" required error={validation.errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  validation.clearError('name')
                }}
              />
            </FormField>
            <FormField label="Адрес">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </FormField>
            <FormField label="Описание">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </FormField>
            <FormField label="Организация" required error={validation.errors.company_id}>
              <select
                value={formData.company_id}
                onChange={(e) => {
                  setFormData({ ...formData, company_id: parseInt(e.target.value, 10) })
                  validation.clearError('company_id')
                }}
              >
                <option value="0">Выберите организацию</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">Сохранить</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingWarehouse(null) }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Адрес</th>
                <th>Описание</th>
                <th>Организация</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <LoadingSpinner message="Загрузка складов..." />
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon="🏭"
                      title="Нет складов"
                      message={!selectedCompanyId ? 'Выберите организацию для просмотра складов' : 'Добавьте первый склад, чтобы начать работу'}
                      action={selectedCompanyId && canWrite(selectedCompanyId) ? {
                        label: 'Добавить склад',
                        onClick: () => {
                          setShowForm(true)
                          setEditingWarehouse(null)
                          setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId })
                        }
                      } : undefined}
                    />
                  </td>
                </tr>
              ) : (
                warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td>{warehouse.name}</td>
                    <td>{warehouse.address || '-'}</td>
                    <td>{warehouse.description || '-'}</td>
                    <td>
                      {companies.find(c => c.id === warehouse.company_id)?.name || warehouse.company_id}
                    </td>
                    <td>
                      {canEdit(warehouse) && (
                        <>
                          <Tooltip content="Редактировать склад">
                            <button onClick={() => handleEdit(warehouse)} style={{ marginRight: '5px' }}>
                              Редактировать
                            </button>
                          </Tooltip>
                          <Tooltip content="Удалить склад">
                            <button onClick={() => handleDelete(warehouse.id)} className="danger">
                              Удалить
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Warehouses

