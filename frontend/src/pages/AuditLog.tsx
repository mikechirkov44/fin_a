import { useState, useEffect } from 'react'
import { auditService } from '../services/api'
import { format } from 'date-fns'

const AuditLog = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    table_name: '',
    action: '',
    start_date: '',
    end_date: '',
  })
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadData()
    loadStats()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.table_name) params.table_name = filters.table_name
      if (filters.action) params.action = filters.action
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      
      const data = await auditService.getLogs(params)
      setLogs(data)
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await auditService.getStats()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters])

  const handleFilterChange = (field: string, value: string) => {
    setFilters({ ...filters, [field]: value })
  }

  const getActionLabel = (action: string) => {
    const labels: { [key: string]: string } = {
      'CREATE': 'Создание',
      'UPDATE': 'Обновление',
      'DELETE': 'Удаление',
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      'CREATE': '#28a745',
      'UPDATE': '#ffc107',
      'DELETE': '#dc3545',
    }
    return colors[action] || '#666'
  }

  const getTableNameLabel = (tableName: string) => {
    const labels: { [key: string]: string } = {
      'money_movements': 'Движение денег',
      'assets': 'Активы',
      'liabilities': 'Обязательства',
      'realizations': 'Реализация',
      'shipments': 'Отгрузка',
      'products': 'Товары',
      'income_items': 'Статьи доходов',
      'expense_items': 'Статьи расходов',
      'companies': 'Компании',
      'marketplaces': 'Маркетплейсы',
      'marketplace_integrations': 'Интеграции',
    }
    return labels[tableName] || tableName
  }

  if (loading && !logs.length) return <div>Загрузка...</div>

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>История изменений</h2>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">Статистика</div>
          <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <strong>Всего записей:</strong> {stats.total_logs}
            </div>
            <div>
              <strong>По действиям:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {Object.entries(stats.action_stats || {}).map(([action, count]: [string, any]) => (
                  <li key={action}>{getActionLabel(action)}: {count}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Фильтры</div>
        <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="form-group">
            <label>Таблица</label>
            <select
              value={filters.table_name}
              onChange={(e) => handleFilterChange('table_name', e.target.value)}
            >
              <option value="">Все таблицы</option>
              <option value="money_movements">Движение денег</option>
              <option value="assets">Активы</option>
              <option value="liabilities">Обязательства</option>
              <option value="realizations">Реализация</option>
              <option value="shipments">Отгрузка</option>
              <option value="products">Товары</option>
              <option value="income_items">Статьи доходов</option>
              <option value="expense_items">Статьи расходов</option>
              <option value="companies">Компании</option>
              <option value="marketplaces">Маркетплейсы</option>
              <option value="marketplace_integrations">Интеграции</option>
            </select>
          </div>
          <div className="form-group">
            <label>Действие</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">Все действия</option>
              <option value="CREATE">Создание</option>
              <option value="UPDATE">Обновление</option>
              <option value="DELETE">Удаление</option>
            </select>
          </div>
          <div className="form-group">
            <label>Дата начала</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Дата окончания</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Таблица логов */}
      <div className="card">
        <div className="card-header">Записи истории</div>
        <table>
          <thead>
            <tr>
              <th>Дата/Время</th>
              <th>Пользователь</th>
              <th>Таблица</th>
              <th>ID записи</th>
              <th>Действие</th>
              <th>Описание</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">Нет записей</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss')}</td>
                  <td>{log.username || `ID: ${log.user_id}`}</td>
                  <td>{getTableNameLabel(log.table_name)}</td>
                  <td>{log.record_id}</td>
                  <td>
                    <span style={{ 
                      color: getActionColor(log.action),
                      fontWeight: 'bold'
                    }}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td>{log.description || '-'}</td>
                  <td>
                    {(log.old_values || log.new_values) && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary>Показать</summary>
                        <div style={{ marginTop: '8px', fontSize: '12px' }}>
                          {log.old_values && (
                            <div style={{ marginBottom: '8px' }}>
                              <strong>Старые значения:</strong>
                              <pre style={{ 
                                background: '#f5f5f5', 
                                padding: '8px', 
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '200px'
                              }}>
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <strong>Новые значения:</strong>
                              <pre style={{ 
                                background: '#f5f5f5', 
                                padding: '8px', 
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '200px'
                              }}>
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
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

export default AuditLog

