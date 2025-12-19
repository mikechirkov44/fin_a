import { useState, useEffect } from 'react'
import { cashFlowService } from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, subMonths } from 'date-fns'

const CashFlow = () => {
  const [report, setReport] = useState<any>(null)
  const [byCategory, setByCategory] = useState<any>(null)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [groupBy, setGroupBy] = useState('month')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate, groupBy])

  const loadData = async () => {
    setLoading(true)
    try {
      const [reportData, incomeData, expenseData] = await Promise.all([
        cashFlowService.getReport({ start_date: startDate, end_date: endDate, group_by: groupBy }),
        cashFlowService.getByCategory({ start_date: startDate, end_date: endDate, movement_type: 'income' }),
        cashFlowService.getByCategory({ start_date: startDate, end_date: endDate, movement_type: 'expense' }),
      ])
      setReport(reportData)
      setByCategory({ income: incomeData, expense: expenseData })
    } catch (error) {
      console.error('Error loading cash flow:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e']

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
          <div className="form-group">
            <label>Группировка</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="month">По месяцам</option>
              <option value="quarter">По кварталам</option>
              <option value="year">По годам</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Движение денежных средств</div>
        <table>
          <thead>
            <tr>
              <th>Период</th>
              <th className="text-right">Поступления</th>
              <th className="text-right">Выбытия</th>
              <th className="text-right">Чистый поток</th>
            </tr>
          </thead>
          <tbody>
            {report.periods.map((period: any, index: number) => (
              <tr key={index}>
                <td>{period.period}</td>
                <td className="text-right" style={{ color: '#27ae60' }}>
                  {period.income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right" style={{ color: '#e74c3c' }}>
                  {period.expense.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right" style={{ fontWeight: 'bold' }}>
                  {period.net.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО</strong></td>
              <td className="text-right">{report.totals.income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
              <td className="text-right">{report.totals.expense.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
              <td className="text-right">{report.totals.net.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">График движения денежных средств</div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={report.periods}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#27ae60" name="Поступления" strokeWidth={2} />
            <Line type="monotone" dataKey="expense" stroke="#e74c3c" name="Выбытия" strokeWidth={2} />
            <Line type="monotone" dataKey="net" stroke="#4a90e2" name="Чистый поток" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {byCategory && (
        <>
          <div className="card">
            <div className="card-header">Поступления по статьям</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>Статья</th>
                      <th className="text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.income.categories.map((cat: any, index: number) => (
                      <tr key={cat.id}>
                        <td>{cat.name}</td>
                        <td className="text-right">{cat.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byCategory.income.categories}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {byCategory.income.categories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Расходы по статьям</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>Статья</th>
                      <th className="text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.expense.categories.map((cat: any, index: number) => (
                      <tr key={cat.id}>
                        <td>{cat.name}</td>
                        <td className="text-right">{cat.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={byCategory.expense.categories}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {byCategory.expense.categories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CashFlow

