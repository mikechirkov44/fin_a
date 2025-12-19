import { useState, useEffect } from 'react'
import { cashFlowAnalysisService } from '../services/api'
import { format, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const CashFlowAnalysis = () => {
  const [report, setReport] = useState<any>(null)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await cashFlowAnalysisService.getAnalysis({ start_date: startDate, end_date: endDate })
      setReport(data)
    } catch (error) {
      console.error('Error loading cash flow analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c']

  if (loading) return <div>Загрузка...</div>
  if (!report) return <div>Нет данных</div>

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-row">
          <div className="form-group">
            <label>Начало периода</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Конец периода</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Выручка по каналам */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Выручка по каналам</div>
        <table>
          <thead>
            <tr>
              <th>Канал</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">% от общей</th>
            </tr>
          </thead>
          <tbody>
            {report.channels.map((channel: any) => {
              const percent = report.total_revenue > 0 
                ? ((channel.revenue / report.total_revenue) * 100).toFixed(2)
                : '0.00'
              return (
                <tr key={channel.channel}>
                  <td>{channel.channel}</td>
                  <td className="text-right">
                    {channel.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                  </td>
                  <td className="text-right">{percent}%</td>
                </tr>
              )
            })}
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО</strong></td>
              <td className="text-right">
                {report.total_revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Производственные расходы */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Производственные расходы</div>
        <table>
          <thead>
            <tr>
              <th>Статья</th>
              <th className="text-right">Сумма</th>
              <th className="text-right">% от выручки</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Затраты на маркетплейсах</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_marketplace_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.total_marketplace_costs / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr>
              <td>Прямые производственные расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.direct_production_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.direct_production_costs / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Всего производственные расходы</strong></td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{(report.total_marketplace_costs + report.direct_production_costs).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? (((report.total_marketplace_costs + report.direct_production_costs) / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Маржинальный доход по каналам */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Маржинальный доход по каналам</div>
        <table>
          <thead>
            <tr>
              <th>Канал</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">Затраты на MP</th>
              <th className="text-right">Маржинальный доход</th>
              <th className="text-right">Рентабельность МД, %</th>
            </tr>
          </thead>
          <tbody>
            {report.channels.map((channel: any) => (
              <tr key={channel.channel}>
                <td>{channel.channel}</td>
                <td className="text-right">
                  {channel.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right" style={{ color: '#e74c3c' }}>
                  -{channel.marketplace_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right" style={{ color: channel.marginal_income >= 0 ? '#27ae60' : '#e74c3c' }}>
                  {channel.marginal_income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right">{channel.marginal_margin}%</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО</strong></td>
              <td className="text-right">
                {report.total_revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_marketplace_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right" style={{ color: report.total_marginal_income >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.total_marginal_income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.total_marginal_income / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Валовая прибыль */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Валовая прибыль</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Маржинальный доход</strong></td>
              <td className="text-right">
                {report.total_marginal_income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Прямые производственные расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.direct_production_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Валовая прибыль</strong></td>
              <td className="text-right" style={{ color: report.gross_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность валовой прибыли</td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.gross_profit / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Косвенные расходы */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Косвенные расходы</div>
        <table>
          <tbody>
            <tr>
              <td>Административные расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.administrative_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.administrative_expenses / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr>
              <td>Коммерческие расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.commercial_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.commercial_expenses / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Всего косвенные расходы</strong></td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_indirect_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.total_indirect_expenses / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Операционная прибыль (EBITDA) */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Операционная прибыль (EBITDA)</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Валовая прибыль</strong></td>
              <td className="text-right">
                {report.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Косвенные расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_indirect_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr style={{ backgroundColor: '#d0d0d0', fontWeight: 'bold', fontSize: '14px' }}>
              <td><strong>ОПЕРАЦИОННАЯ ПРИБЫЛЬ (EBITDA)</strong></td>
              <td className="text-right" style={{ color: report.operating_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.operating_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность по EBITDA</td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.operating_profit / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Графики */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="card-header">Выручка по каналам</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report.channels.filter((c: any) => c.revenue > 0)}
                dataKey="revenue"
                nameKey="channel"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {report.channels.filter((c: any) => c.revenue > 0).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">Маржинальный доход по каналам</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.channels.filter((c: any) => c.revenue > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
              <Legend />
              <Bar dataKey="marginal_income" fill="#4a90e2" name="Маржинальный доход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default CashFlowAnalysis
