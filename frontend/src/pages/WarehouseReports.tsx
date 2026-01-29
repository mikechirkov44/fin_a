import { useState, useEffect } from 'react'
import { inventoryService, warehousesService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { Select } from '../components/ui'

type SortField = 'product_name' | 'warehouse_name' | 'quantity' | 'min_stock_level'
type SortDirection = 'asc' | 'desc'

const WarehouseReports = () => {
  const { selectedCompanyId } = useAuth()
  const { showError } = useToast()
  const [activeTab, setActiveTab] = useState<'turnover' | 'stock'>('turnover')
  const [turnoverData, setTurnoverData] = useState<any[]>([])
  const [stockData, setStockData] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [loadingTurnover, setLoadingTurnover] = useState(false)
  const [loadingStock, setLoadingStock] = useState(false)
  const [sortField, setSortField] = useState<SortField>('product_name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    if (selectedCompanyId) {
      loadWarehouses()
      if (activeTab === 'turnover') {
        loadTurnover()
      } else {
        loadStock()
      }
    }
  }, [selectedCompanyId, activeTab])

  const loadWarehouses = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await warehousesService.getWarehouses(params)
      setWarehouses(data.filter((w: any) => w.is_active !== false))
    } catch (error) {
      console.error('Error loading warehouses:', error)
    }
  }

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

  const loadStock = async () => {
    setLoadingStock(true)
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      // Если выбран конкретный склад, фильтруем
      if (selectedWarehouseId) {
        params.warehouse_id = parseInt(selectedWarehouseId)
      }
      const data = await inventoryService.getInventory(params)
      setStockData(data)
    } catch (error) {
      console.error('Error loading stock:', error)
      showError('Ошибка загрузки остатков')
    } finally {
      setLoadingStock(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'stock' && selectedCompanyId) {
      loadStock()
    }
  }, [selectedWarehouseId])


  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedStockData = [...stockData].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'product_name':
        aValue = a.product_name || ''
        bValue = b.product_name || ''
        break
      case 'warehouse_name':
        aValue = a.warehouse_name || ''
        bValue = b.warehouse_name || ''
        break
      case 'quantity':
        aValue = parseFloat(a.quantity)
        bValue = parseFloat(b.quantity)
        break
      case 'min_stock_level':
        aValue = parseFloat(a.min_stock_level)
        bValue = parseFloat(b.min_stock_level)
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
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
        <h2>Отчеты по складам</h2>
      </div>

      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('turnover')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: 'none',
            backgroundColor: activeTab === 'turnover' ? '#4a90e2' : '#f0f0f0',
            color: activeTab === 'turnover' ? 'white' : 'black',
            cursor: 'pointer',
          }}
        >
          Отчет по оборачиваемости
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'stock' ? '#4a90e2' : '#f0f0f0',
            color: activeTab === 'stock' ? 'white' : 'black',
            cursor: 'pointer',
          }}
        >
          Остатки по складам
        </button>
      </div>

      {activeTab === 'turnover' && (
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
      )}

      {activeTab === 'stock' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">Фильтр по складам</div>
            <div style={{ padding: '15px' }}>
              <Select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                placeholder="Все склады"
                options={[
                  { value: '', label: 'Все склады' },
                  ...warehouses.map(warehouse => ({
                    value: warehouse.id.toString(),
                    label: warehouse.name
                  }))
                ]}
                fullWidth={false}
                style={{ width: '250px' }}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header">Остатки по складам</div>
            {loadingStock ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <LoadingSpinner />
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort('product_name')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Товар {getSortIcon('product_name')}
                    </th>
                    <th
                      onClick={() => handleSort('warehouse_name')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Склад {getSortIcon('warehouse_name')}
                    </th>
                    <th
                      onClick={() => handleSort('quantity')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Количество {getSortIcon('quantity')}
                    </th>
                    <th
                      onClick={() => handleSort('min_stock_level')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      Мин. остаток {getSortIcon('min_stock_level')}
                    </th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStockData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                        Нет данных об остатках
                      </td>
                    </tr>
                  ) : (
                    sortedStockData.map((item) => (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WarehouseReports
