import { useState, useEffect } from 'react'
import { usersService, referenceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { HiOutlinePencil, HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi2'
import { Button, Input, Select } from '../components/ui'

const Users = () => {
  const { isAdmin } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'VIEWER',
  })
  
  const validation = useFormValidation({
    email: { required: true, email: true },
    username: { required: true },
    password: { required: (value) => !editingUser, minLength: editingUser ? 0 : 6 },
    role: { required: true },
  })

  useEffect(() => {
    if (isAdmin) {
      loadData()
      loadCompanies()
    }
  }, [isAdmin])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await usersService.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
      showError('Ошибка загрузки пользователей')
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
      if (editingUser) {
        await usersService.updateUser(editingUser.id, formData)
      } else {
        await usersService.createUser(formData)
      }
      handleClose()
      showSuccess(editingUser ? 'Пользователь успешно обновлен' : 'Пользователь успешно создан')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при сохранении пользователя')
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({ email: '', username: '', password: '', role: 'VIEWER' })
    validation.clearAllErrors()
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление пользователя',
      message: 'Вы уверены, что хотите деактивировать этого пользователя?',
      confirmText: 'Деактивировать',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await usersService.updateUser(id, { is_active: false })
      showSuccess('Пользователь успешно деактивирован')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка деактивации пользователя')
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
          setEditingUser(null)
          setFormData({ email: '', username: '', password: '', role: 'VIEWER' })
        }
      },
      description: 'Создать нового пользователя',
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

  if (!isAdmin) {
    return <div>У вас нет доступа к этой странице</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление пользователями</h2>
        <Tooltip content="Создать нового пользователя (Ctrl+N)">
          <Button variant="primary" icon={<HiOutlinePlus />} onClick={() => { 
            setShowForm(true)
            setEditingUser(null)
            setFormData({ email: '', username: '', password: '', role: 'VIEWER' })
            validation.clearAllErrors()
          }}>
            Добавить пользователя
          </Button>
        </Tooltip>
      </div>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
            <FormField label="Email" required error={validation.errors.email}>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  validation.clearError('email')
                }}
              />
            </FormField>
            <FormField label="Имя пользователя" required error={validation.errors.username}>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value })
                  validation.clearError('username')
                }}
              />
            </FormField>
            <FormField 
              label={`Пароль ${editingUser ? '(оставьте пустым, чтобы не менять)' : ''}`} 
              required={!editingUser}
              error={validation.errors.password}
            >
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  validation.clearError('password')
                }}
              />
            </FormField>
            <FormField label="Роль" required error={validation.errors.role}>
              <Select
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value })
                  validation.clearError('role')
                }}
                options={[
                  { value: 'ADMIN', label: 'Администратор' },
                  { value: 'ACCOUNTANT', label: 'Бухгалтер' },
                  { value: 'MANAGER', label: 'Менеджер' },
                  { value: 'VIEWER', label: 'Просмотр' }
                ]}
              />
            </FormField>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editingUser && editingUser.is_active && (
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Деактивация пользователя',
                        message: 'Вы уверены, что хотите деактивировать этого пользователя?',
                        confirmText: 'Деактивировать',
                        cancelText: 'Отмена',
                        type: 'danger',
                      })
                      if (confirmed) {
                        try {
                          await usersService.updateUser(editingUser.id, { is_active: false })
                          showSuccess('Пользователь деактивирован')
                          handleClose()
                          loadData()
                        } catch (error: any) {
                          showError(error.response?.data?.detail || 'Ошибка деактивации пользователя')
                        }
                      }
                    }}
                    icon={<HiOutlineTrash />}
                  >
                    Деактивировать
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
                <th>Email</th>
                <th>Имя пользователя</th>
                <th>Роль</th>
                <th>Активен</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <LoadingSpinner message="Загрузка пользователей..." />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon="👥"
                      title="Нет пользователей"
                      message="Добавьте первого пользователя, чтобы начать работу"
                      action={{
                        label: 'Добавить пользователя',
                        onClick: () => {
                          setShowForm(true)
                          setEditingUser(null)
                          setFormData({ email: '', username: '', password: '', role: 'VIEWER' })
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td>
                      {user.role === 'ADMIN' && 'Администратор'}
                      {user.role === 'ACCOUNTANT' && 'Бухгалтер'}
                      {user.role === 'MANAGER' && 'Менеджер'}
                      {user.role === 'VIEWER' && 'Просмотр'}
                    </td>
                    <td>{user.is_active ? 'Да' : 'Нет'}</td>
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

export default Users

