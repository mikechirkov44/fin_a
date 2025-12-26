import { useState, useEffect } from 'react'
import { warehousesService, referenceService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Warehouses = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    company_id: selectedCompanyId || 0,
  })

  useEffect(() => {
    loadData()
    loadCompanies()
  }, [selectedCompanyId])

  const loadData = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await warehousesService.getWarehouses(params)
      setWarehouses(data)
    } catch (error) {
      console.error('Error loading warehouses:', error)
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
      if (editingWarehouse) {
        await warehousesService.updateWarehouse(editingWarehouse.id, formData)
      } else {
        await warehousesService.createWarehouse(formData)
      }
      setShowForm(false)
      setEditingWarehouse(null)
      setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId || 0 })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка при сохранении склада')
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
    if (!confirm('Вы уверены, что хотите удалить этот склад?')) return
    try {
      await warehousesService.deleteWarehouse(id)
      loadData()
    } catch (error) {
      console.error('Error deleting warehouse:', error)
    }
  }

  const canEdit = (warehouse: any) => {
    return canWrite(warehouse.company_id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление складами</h2>
        {selectedCompanyId && canWrite(selectedCompanyId) && (
          <button onClick={() => { 
            setShowForm(true)
            setEditingWarehouse(null)
            setFormData({ name: '', address: '', description: '', company_id: selectedCompanyId })
          }}>
            Добавить склад
          </button>
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
            <div style={{ marginBottom: '15px' }}>
              <label>Название:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Адрес:</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Описание:</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Организация:</label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: parseInt(e.target.value, 10) })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="">Выберите организацию</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
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
            {warehouses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  Нет складов
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
                        <button onClick={() => handleEdit(warehouse)} style={{ marginRight: '5px' }}>
                          Редактировать
                        </button>
                        <button onClick={() => handleDelete(warehouse.id)}>
                          Удалить
                        </button>
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
  )
}

export default Warehouses

