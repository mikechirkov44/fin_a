import { useState, useEffect } from 'react'
import { usersService, referenceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Users = () => {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'VIEWER',
  })

  useEffect(() => {
    if (isAdmin) {
      loadData()
      loadCompanies()
    }
  }, [isAdmin])

  const loadData = async () => {
    try {
      const data = await usersService.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error loading users:', error)
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
    try {
      if (editingUser) {
        await usersService.updateUser(editingUser.id, formData)
      } else {
        await usersService.createUser(formData)
      }
      setShowForm(false)
      setEditingUser(null)
      setFormData({ email: '', username: '', password: '', role: 'VIEWER' })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка при сохранении пользователя')
    }
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
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return
    try {
      await usersService.updateUser(id, { is_active: false })
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (!isAdmin) {
    return <div>У вас нет доступа к этой странице</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление пользователями</h2>
        <button onClick={() => { setShowForm(true); setEditingUser(null); setFormData({ email: '', username: '', password: '', role: 'VIEWER' }) }}>
          Добавить пользователя
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            {editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Имя пользователя:</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Пароль {editingUser && '(оставьте пустым, чтобы не менять)'}:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Роль:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="ADMIN">Администратор</option>
                <option value="ACCOUNTANT">Бухгалтер</option>
                <option value="MANAGER">Менеджер</option>
                <option value="VIEWER">Просмотр</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">Сохранить</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingUser(null) }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя пользователя</th>
              <th>Роль</th>
              <th>Активен</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
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
                <td>
                  <button onClick={() => handleEdit(user)} style={{ marginRight: '5px' }}>
                    Редактировать
                  </button>
                  {user.companies && user.companies.length > 0 && (
                    <button onClick={() => alert(`Организации: ${user.companies.map((uc: any) => uc.company_id).join(', ')}`)}>
                      Организации
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Users

