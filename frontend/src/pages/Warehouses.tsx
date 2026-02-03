import { useState, useEffect } from 'react'
import { warehousesService, referenceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import CompanySelectField from '../components/CompanySelectField'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2'
import { Button, Input } from '../components/ui'

const Warehouses = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
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
      handleClose()
      showSuccess(editingWarehouse ? 'Склад успешно обновлен' : 'Склад успешно добавлен')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при сохранении склада')
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingWarehouse(null)
    setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId || 0 })
    validation.clearAllErrors()
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
          handleClose()
        }
      },
      description: 'Закрыть форму',
    },
  ])

  const canEdit = (warehouse: any) => {
    // Если есть selectedCompanyId, проверяем права на эту организацию
    if (selectedCompanyId) {
      return canWrite(selectedCompanyId)
    }
    // Иначе проверяем права на организацию склада
    return canWrite(warehouse.company_id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление складами</h2>
        {selectedCompanyId && canWrite(selectedCompanyId) && (
          <Tooltip content="Создать новый склад (Ctrl+N)">
            <Button variant="primary" icon={<HiOutlinePlus />} onClick={() => { 
              setShowForm(true)
              setEditingWarehouse(null)
              setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId })
              validation.clearAllErrors()
            }}>
              Добавить склад
            </Button>
          </Tooltip>
        )}
      </div>

      {!selectedCompanyId && (
        <div className="card" style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          backgroundColor: 'var(--warning-bg, #fff3cd)',
          color: 'var(--warning-text, var(--text-primary))',
          border: '1px solid var(--warning-border, var(--border-color))'
        }}>
          Выберите организацию для просмотра складов
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingWarehouse ? 'Редактировать склад' : 'Добавить склад'}
        maxWidth="700px"
      >
        <form onSubmit={handleSubmit}>
            <FormField label="Название" required error={validation.errors.name}>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  validation.clearError('name')
                }}
              />
            </FormField>
            <FormField label="Адрес">
              <Input
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
              <CompanySelectField
                value={formData.company_id ? formData.company_id.toString() : ''}
                onChange={(value) => {
                  setFormData({ ...formData, company_id: value ? parseInt(value, 10) : 0 })
                  validation.clearError('company_id')
                }}
                placeholder="Выберите организацию..."
              />
            </FormField>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editingWarehouse && (
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Удаление склада',
                        message: 'Вы уверены, что хотите удалить этот склад?',
                        confirmText: 'Удалить',
                        cancelText: 'Отмена',
                        type: 'danger',
                      })
                      if (confirmed) {
                        try {
                          await warehousesService.deleteWarehouse(editingWarehouse.id)
                          showSuccess('Склад удален')
                          handleClose()
                          loadData()
                        } catch (error: any) {
                          showError(error.response?.data?.detail || 'Ошибка удаления склада')
                        }
                      }
                    }}
                    icon={<HiOutlineTrash />}
                  >
                    Удалить
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary">
                  Сохранить
                </Button>
              </div>
            </div>
          </form>
      </Modal>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Адрес</th>
                <th>Описание</th>
                <th>Организация</th>
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
                  <tr 
                    key={warehouse.id}
                    className="clickable"
                    onClick={() => canEdit(warehouse) && handleEdit(warehouse)}
                  >
                    <td>{warehouse.name}</td>
                    <td>{warehouse.address || '-'}</td>
                    <td>{warehouse.description || '-'}</td>
                    <td>
                      {companies.find(c => c.id === warehouse.company_id)?.name || warehouse.company_id}
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

