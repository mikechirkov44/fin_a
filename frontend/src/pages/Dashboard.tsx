import { useEffect, useState } from 'react'
import { LineChart, BarChart } from '../components/charts'
import { dashboardService, bankCashService } from '../services/api'
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
  const [accountBalances, setAccountBalances] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingBalances, setLoadingBalances] = useState(true)
  const { selectedCompanyId } = useAuth()

  useEffect(() => {
    loadData()
    loadAccountBalances()
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

  const loadAccountBalances = async () => {
    try {
      setLoadingBalances(true)
      const params: any = {
        balance_date: format(new Date(), 'yyyy-MM-dd'),
      }
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const balances = await bankCashService.getAccountBalances(params)
      setAccountBalances(balances)
    } catch (error) {
      console.error('Error loading account balances:', error)
    } finally {
      setLoadingBalances(false)
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

  // Преобразуем данные для Chartist.js
  const cashBalanceChartData = {
    labels: cashBalanceDynamics.map((item: any) => item.label),
    series: [cashBalanceDynamics.map((item: any) => item.balance)]
  }

  const netProfitChartData = {
    labels: netProfitDynamics.map((item: any) => item.label),
    series: [netProfitDynamics.map((item: any) => item.net_profit)]
  }

  const netMarginChartData = {
    labels: netProfitDynamics.map((item: any) => item.label),
    series: [netProfitDynamics.map((item: any) => item.net_margin)]
  }

  const grossProfitChartData = {
    labels: grossProfitDynamics.map((item: any) => item.label),
    series: [
      grossProfitDynamics.map((item: any) => item.gross_profit),
      grossProfitDynamics.map((item: any) => item.gross_margin)
    ]
  }

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
        <LineChart 
          data={cashBalanceChartData}
          height={300}
          colors={['#4a90e2']}
          options={{
            lineSmooth: true,
            showPoint: true,
            showArea: false,
            chartPadding: {
              left: 150,  // Увеличено для полной видимости значений в рублях
              right: 40,
              top: 20,
              bottom: 50
            },
            axisY: {
              labelInterpolationFnc: (value: number) => {
                if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                  return '0 ₽'
                }
                // Используем более компактное форматирование для больших чисел
                const absValue = Math.abs(value)
                if (absValue >= 1000000) {
                  const millions = value / 1000000
                  const formatted = Math.abs(millions) < 10 
                    ? millions.toFixed(1).replace(/\.0$/, '') 
                    : Math.round(millions).toString()
                  return formatted + ' млн ₽'
                } else if (absValue >= 1000) {
                  const thousands = value / 1000
                  const formatted = Math.abs(thousands) < 10 
                    ? thousands.toFixed(1).replace(/\.0$/, '') 
                    : Math.round(thousands).toString()
                  return formatted + ' тыс ₽'
                }
                return value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₽'
              }
            }
          }}
          showTooltip={true}
          tooltipFormatter={(value: number, label: string, seriesIndex: number) => {
            const formattedValue = typeof value === 'number' && !isNaN(value) && isFinite(value)
              ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
              : '0.00'
            return `${label}\nОстаток: ${formattedValue} ₽`
          }}
        />
      </div>

      <div className="card">
        <div className="card-header">Динамика чистой прибыли</div>
        <BarChart 
          data={netProfitChartData}
          height={300}
          colors={['#4a90e2']}
          options={{
            axisY: {
              labelInterpolationFnc: (value: number) => value.toLocaleString('ru-RU') + ' ₽'
            }
          }}
        />
      </div>

      <div className="card">
        <div className="card-header">Динамика рентабельности чистой прибыли</div>
        <LineChart 
          data={netMarginChartData}
          height={300}
          colors={['#27ae60']}
          options={{
            lineSmooth: true,
            showPoint: true,
            showArea: false,
            axisY: {
              labelInterpolationFnc: (value: number) => {
                if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                  return '0%'
                }
                return value + '%'
              }
            }
          }}
        />
      </div>

      <div className="card">
        <div className="card-header">Динамика валовой прибыли и рентабельности</div>
        <LineChart 
          data={grossProfitChartData}
          height={300}
          colors={['#4a90e2', '#27ae60']}
          options={{
            lineSmooth: true,
            showPoint: true,
            showArea: false,
            axisY: {
              labelInterpolationFnc: (value: number) => {
                // Первая серия - валовая прибыль в рублях, вторая - рентабельность в процентах
                return value.toLocaleString('ru-RU')
              }
            }
          }}
        />
      </div>

      {accountBalances && (
        <div className="card">
          <div className="card-header">Остатки на счетах</div>
          {loadingBalances ? (
            <div style={{ padding: '16px' }}>
              <LoadingSpinner message="Загрузка остатков..." />
            </div>
          ) : accountBalances.accounts && accountBalances.accounts.length > 0 ? (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {accountBalances.accounts.map((account: any) => (
                  <div
                    key={account.account_id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #ddd)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {account.account_name}
                    </div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 'bold',
                      color: account.balance >= 0 ? 'var(--success-color, #27ae60)' : 'var(--danger-color, #e74c3c)'
                    }}>
                      {account.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ 
                marginTop: '16px', 
                paddingTop: '16px', 
                borderTop: '2px solid var(--border-color, #ddd)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <strong>ИТОГО:</strong>
                <strong style={{ 
                  fontSize: '20px',
                  color: accountBalances.total_balance >= 0 ? 'var(--success-color, #27ae60)' : 'var(--danger-color, #e74c3c)'
                }}>
                  {accountBalances.total_balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </strong>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
              Нет данных о счетах
            </div>
          )}
        </div>
      )}

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
                  backgroundColor: rec.priority === 'high' 
                    ? 'var(--warning-bg, #fff3cd)' 
                    : 'var(--info-bg, #d1ecf1)',
                  color: rec.priority === 'high' 
                    ? 'var(--warning-text, var(--text-primary))' 
                    : 'var(--info-text, var(--text-primary))',
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

