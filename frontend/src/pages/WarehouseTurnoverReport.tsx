import { useState, useEffect } from 'react'
import { inventoryService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'

const WarehouseTurnoverReport = () => {
  const { selectedCompanyId } = useAuth()
  const { showError } = useToast()
  const [turnoverData, setTurnoverData] = useState<any[]>([])
  const [loadingTurnover, setLoadingTurnover] = useState(false)

  useEffect(() => {
    if (selectedCompanyId) {
      loadTurnover()
    }
  }, [selectedCompanyId])

  const loadTurnover = async () => {
    setLoadingTurnover(true)
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      params.start_date = startDate.toISOString().split('T')[0]
      params.end_date = endDate.toISOString().split('T')[0]
      
      const data = await inventoryService.getTurnover(params)
      setTurnoverData(data)
    } catch (error) {
      console.error('Error loading turnover:', error)
      showError('Ошибка загрузки отчета по оборачиваемости')
    } finally {
      setLoadingTurnover(false)
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
        Выберите организацию для просмотра отчетов
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2>Отчет по оборачиваемости</h2>
      </div>

      <div className="card">
        <div className="card-header">Отчет по оборачиваемости (последние 3 месяца)</div>
        {loadingTurnover ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Средний остаток</th>
                <th>Продано (шт)</th>
                <th>Выручка</th>
                <th>COGS</th>
                <th>Коэф. оборачиваемости</th>
                <th>Дни оборачиваемости</th>
              </tr>
            </thead>
            <tbody>
              {turnoverData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    Нет данных для анализа
                  </td>
                </tr>
              ) : (
                turnoverData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.product_name || `Товар #${item.product_id}`}</td>
                    <td>{item.average_inventory.toFixed(3)}</td>
                    <td>{item.sales_quantity.toFixed(3)}</td>
                    <td>{item.sales_revenue.toFixed(2)} ₽</td>
                    <td>{item.cogs.toFixed(2)} ₽</td>
                    <td>{item.turnover_ratio.toFixed(2)}</td>
                    <td>{item.days_turnover.toFixed(1)} дней</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default WarehouseTurnoverReport
