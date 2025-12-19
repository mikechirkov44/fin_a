import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { dashboardService } from '../services/api'
import { format } from 'date-fns'

const Dashboard = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      const result = await dashboardService.getDashboard({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      })
      setData(result)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Загрузка...</div>
  if (!data) return <div>Нет данных</div>

  return (
    <div>
      <div className="card">
        <div className="card-header">Текущие показатели</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Выручка</strong></td>
              <td className="text-right">{data.current_indicators.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Себестоимость</strong></td>
              <td className="text-right">{data.current_indicators.cost_of_goods.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Расходы</strong></td>
              <td className="text-right">{data.current_indicators.expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Валовая прибыль</strong></td>
              <td className="text-right">{data.current_indicators.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Рентабельность валовой прибыли</strong></td>
              <td className="text-right">{data.current_indicators.gross_margin}%</td>
            </tr>
            <tr>
              <td><strong>Чистая прибыль</strong></td>
              <td className="text-right">{data.current_indicators.net_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Рентабельность чистой прибыли</strong></td>
              <td className="text-right">{data.current_indicators.net_margin}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">Динамика остатков на счетах</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.cash_balance_dynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
            <Legend />
            <Line type="monotone" dataKey="balance" stroke="#4a90e2" name="Остаток" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">Динамика чистой прибыли</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.net_profit_dynamics}>
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
          <LineChart data={data.net_profit_dynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip formatter={(value: number) => value + '%'} />
            <Legend />
            <Line type="monotone" dataKey="net_margin" stroke="#27ae60" name="Рентабельность %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">Динамика валовой прибыли и рентабельности</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.gross_profit_dynamics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="gross_profit" stroke="#4a90e2" name="Валовая прибыль" />
            <Line yAxisId="right" type="monotone" dataKey="gross_margin" stroke="#27ae60" name="Рентабельность %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default Dashboard

