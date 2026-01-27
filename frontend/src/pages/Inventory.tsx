import { useState, useEffect } from 'react'
import { inventoryService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'

const Inventory = () => {
  const { selectedCompanyId } = useAuth()
  const { showError } = useToast()
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (selectedCompanyId) {
      loadInventory()
    }
  }, [selectedCompanyId])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await inventoryService.getInventory(params)
      setInventory(data)
    } catch (error) {
      console.error('Error loading inventory:', error)
      showError('Ошибка загрузки остатков')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedCompanyId) {
    return (
      <div className="card" style={{ 
        padding: '20px', 
        backgroundColor: 'var(--warning-bg, #fff3cd)',
        color: 'var(--warning-text, var(--text-primary))',
        border: '1px solid var(--warning-border, var(--border-color))'
      }}>
        Выберите организацию для просмотра остатков
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2>Остатки</h2>
      </div>

      <div className="card">
        <div className="card-header">Текущие остатки</div>
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Склад</th>
              <th>Количество</th>
              <th>Мин. остаток</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                  Нет данных об остатках
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.product_name || `Товар #${item.product_id}`}</td>
                  <td>{item.warehouse_name || `Склад #${item.warehouse_id}`}</td>
                  <td>{parseFloat(item.quantity).toFixed(3)}</td>
                  <td>{parseFloat(item.min_stock_level).toFixed(3)}</td>
                  <td>
                    {parseFloat(item.quantity) < parseFloat(item.min_stock_level) ? (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>Низкий остаток</span>
                    ) : (
                      <span style={{ color: 'green' }}>Норма</span>
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

export default Inventory

