import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { dashboardService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import MetricCard from '../components/MetricCard'
import SkeletonLoader from '../components/SkeletonLoader'
import { translateChartLabels } from '../utils/dateUtils'
import './Dashboard.css'

const Dashboard = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { selectedCompanyId } = useAuth()

  useEffect(() => {
    loadData()
  }, [selectedCompanyId])

  const loadData = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      const result = await dashboardService.getDashboard({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        company_id: selectedCompanyId || undefined,
      })
      setData(result)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="dashboard-metrics-grid">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
        <div style={{ marginTop: '24px' }}>
          <SkeletonLoader type="card" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon="📊"
        title="Нет данных"
        message="Не удалось загрузить данные для отображения. Попробуйте обновить страницу."
      />
    )
  }

  const indicators = data.current_indicators
  const isProfitPositive = indicators.net_profit >= 0
  const isGrossProfitPositive = indicators.gross_profit >= 0

  // Преобразуем названия месяцев в русские
  const cashBalanceDynamics = translateChartLabels(data.cash_balance_dynamics || [])
  const netProfitDynamics = translateChartLabels(data.net_profit_dynamics || [])
  const grossProfitDynamics = translateChartLabels(data.gross_profit_dynamics || [])

  return (
    <div>
      <div className="dashboard-metrics-grid">
        <MetricCard
          title="Выручка"
          value={`${indicators.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
          icon="💰"
          color="primary"
        />
        <MetricCard
          title="Себестоимость"
          value={`${indicators.cost_of_goods.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
          icon="📦"
          color="info"
        />
        <MetricCard
          title="Расходы"
          value={`${indicators.expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
          icon="💸"
          color="warning"
        />
        <MetricCard
          title="Валовая прибыль"
          value={`${indicators.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
          icon="📈"
          color={isGrossProfitPositive ? 'success' : 'danger'}
          subtitle={`Рентабельность: ${indicators.gross_margin}%`}
        />
        <MetricCard
          title="Рентабельность валовой прибыли"
          value={`${indicators.gross_margin}%`}
          icon="📊"
          color={indicators.gross_margin >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Чистая прибыль"
          value={`${indicators.net_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
          icon="💵"
          color={isProfitPositive ? 'success' : 'danger'}
          subtitle={`Рентабельность: ${indicators.net_margin}%`}
        />
        <MetricCard
          title="Рентабельность чистой прибыли"
          value={`${indicators.net_margin}%`}
          icon="🎯"
          color={indicators.net_margin >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className="card">
        <div className="card-header">Динамика остатков на счетах</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashBalanceDynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#4a90e2" name="Остаток" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">Динамика чистой прибыли</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={netProfitDynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
            <Legend />
            <Bar dataKey="net_profit" fill="#4a90e2" name="Чистая прибыль" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">Динамика рентабельности чистой прибыли</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={netProfitDynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => value + '%'} />
            <Legend />
            <Line type="monotone" dataKey="net_margin" stroke="#27ae60" name="Рентабельность %" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">Динамика валовой прибыли и рентабельности</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={grossProfitDynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="gross_profit" stroke="#4a90e2" name="Валовая прибыль" strokeWidth={3} />
            <Line yAxisId="right" type="monotone" dataKey="gross_margin" stroke="#27ae60" name="Рентабельность %" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.recommendations && data.recommendations.length > 0 && (
        <div className="card">
          <div className="card-header">Рекомендации</div>
          <div style={{ padding: '16px' }}>
            {data.recommendations.map((rec: any, index: number) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: rec.priority === 'high' ? '#fff3cd' : '#d1ecf1',
                  borderLeft: `4px solid ${rec.priority === 'high' ? '#ffc107' : '#17a2b8'}`,
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{rec.title}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{rec.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

