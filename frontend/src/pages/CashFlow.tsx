import { useState, useEffect } from 'react'
import { cashFlowService } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, subMonths } from 'date-fns'
import { translateChartLabels } from '../utils/dateUtils'

const CashFlow = () => {
  const [report, setReport] = useState<any>(null)
  const [byCategory, setByCategory] = useState<any>(null)
  const [byGroup, setByGroup] = useState<any>(null)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 4), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [groupBy, setGroupBy] = useState('month')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate, groupBy])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('Запрос данных ДДС:', { startDate, endDate, groupBy })
      const [reportData, incomeData, expenseData, incomeGroupsData, expenseGroupsData] = await Promise.all([
        cashFlowService.getReport({ start_date: startDate, end_date: endDate, group_by: groupBy }),
        cashFlowService.getByCategory({ start_date: startDate, end_date: endDate, movement_type: 'income' }),
        cashFlowService.getByCategory({ start_date: startDate, end_date: endDate, movement_type: 'expense' }),
        cashFlowService.getByGroup({ start_date: startDate, end_date: endDate, movement_type: 'income' }),
        cashFlowService.getByGroup({ start_date: startDate, end_date: endDate, movement_type: 'expense' }),
      ])
      console.log('Получены данные ДДС:', { reportData, incomeData, expenseData, incomeGroupsData, expenseGroupsData })
      setReport(reportData)
      setByCategory({ income: incomeData, expense: expenseData })
      setByGroup({ income: incomeGroupsData, expense: expenseGroupsData })
    } catch (error: any) {
      console.error('Error loading cash flow:', error)
      console.error('Error details:', error.response?.data, error.response?.status)
      setReport(null)
      setByCategory(null)
      // Показываем сообщение об ошибке
      if (error.response) {
        const errorMsg = error.response.data?.detail || error.message || 'Неизвестная ошибка'
        console.error('Ошибка API:', errorMsg)
        // Ошибка загрузки данных обрабатывается в catch блоке
      } else {
        console.error('Ошибка сети:', error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e']

  if (loading) return <div>Загрузка...</div>
  if (!report || !report.periods || report.periods.length === 0) {
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
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Нет данных за выбранный период ({startDate} - {endDate})</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>Попробуйте изменить период или добавьте данные в разделе "Движения денежных средств"</p>
          </div>
        </div>
      </div>
    )
  }

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
          <LineChart data={translateChartLabels(report.periods)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#27ae60" name="Поступления" strokeWidth={3} />
            <Line type="monotone" dataKey="expense" stroke="#e74c3c" name="Выбытия" strokeWidth={3} />
            <Line type="monotone" dataKey="net" stroke="#4a90e2" name="Чистый поток" strokeWidth={3} />
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
                    {byCategory.income.categories.map((cat: any) => (
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
                      label={({ value }: any) => {
                        const total = byCategory.income.categories.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
                        const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0'
                        return `${value.toLocaleString('ru-RU')} (${percentage}%)`
                      }}
                    >
                      {byCategory.income.categories.map((_entry: any, index: number) => (
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
                    {byCategory.expense.categories.map((cat: any) => (
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
                      label={({ value }: any) => {
                        const total = byCategory.expense.categories.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
                        const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0'
                        return `${value.toLocaleString('ru-RU')} (${percentage}%)`
                      }}
                    >
                      {byCategory.expense.categories.map((_entry: any, index: number) => (
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

      {byGroup && byGroup.income && byGroup.income.groups && byGroup.income.groups.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="card-header">Поступления по группам</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Группа</th>
                    <th className="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {byGroup.income.groups.map((group: any) => (
                    <>
                      <tr key={group.id} style={{ backgroundColor: '#f5f5f5' }}>
                        <td>
                          <strong>{group.name}</strong>
                        </td>
                        <td className="text-right" style={{ fontWeight: 'bold' }}>
                          {group.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </td>
                      </tr>
                      {group.subgroups && group.subgroups.length > 0 ? (
                        group.subgroups.map((subgroup: any) => (
                          <>
                            <tr key={subgroup.id} style={{ backgroundColor: '#fafafa' }}>
                              <td style={{ paddingLeft: '20px' }}>
                                <strong>{subgroup.name}</strong>
                                {subgroup.items && subgroup.items.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#666' }}>
                                    {subgroup.items.map((item: any) => (
                                      <div key={item.id} style={{ marginTop: '4px' }}>
                                        {item.name}: {item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="text-right" style={{ fontWeight: 'bold' }}>
                                {subgroup.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                              </td>
                            </tr>
                          </>
                        ))
                      ) : (
                        group.items && group.items.length > 0 && (
                          <tr>
                            <td colSpan={2} style={{ paddingLeft: '20px' }}>
                              {group.items.map((item: any) => (
                                <div key={item.id} style={{ marginTop: '4px', fontSize: '12px' }}>
                                  {item.name}: {item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                                </div>
                              ))}
                            </td>
                          </tr>
                        )
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byGroup.income.groups}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ value }: any) => {
                      const total = byGroup.income.groups.reduce((sum: number, g: any) => sum + (g.amount || 0), 0)
                      const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0'
                      return `${value.toLocaleString('ru-RU')} (${percentage}%)`
                    }}
                  >
                    {byGroup.income.groups.map((_entry: any, index: number) => (
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
      )}

      {byGroup && byGroup.expense && byGroup.expense.groups && byGroup.expense.groups.length > 0 && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="card-header">Выбытия по группам</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Группа</th>
                    <th className="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {byGroup.expense.groups.map((group: any) => (
                    <>
                      <tr key={group.id} style={{ backgroundColor: '#f5f5f5' }}>
                        <td>
                          <strong>{group.name}</strong>
                        </td>
                        <td className="text-right" style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                          {group.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                        </td>
                      </tr>
                      {group.subgroups && group.subgroups.length > 0 ? (
                        group.subgroups.map((subgroup: any) => (
                          <>
                            <tr key={subgroup.id} style={{ backgroundColor: '#fafafa' }}>
                              <td style={{ paddingLeft: '20px' }}>
                                <strong>{subgroup.name}</strong>
                                {subgroup.items && subgroup.items.length > 0 && (
                                  <div style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#666' }}>
                                    {subgroup.items.map((item: any) => (
                                      <div key={item.id} style={{ marginTop: '4px' }}>
                                        {item.name}: {item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="text-right" style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                                {subgroup.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                              </td>
                            </tr>
                          </>
                        ))
                      ) : (
                        group.items && group.items.length > 0 && (
                          <tr>
                            <td colSpan={2} style={{ paddingLeft: '20px' }}>
                              {group.items.map((item: any) => (
                                <div key={item.id} style={{ marginTop: '4px', fontSize: '12px' }}>
                                  {item.name}: {item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                                </div>
                              ))}
                            </td>
                          </tr>
                        )
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={byGroup.expense.groups}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ value }: any) => {
                      const total = byGroup.expense.groups.reduce((sum: number, g: any) => sum + (g.amount || 0), 0)
                      const percentage = total > 0 ? (value / total * 100).toFixed(1) : '0.0'
                      return `${value.toLocaleString('ru-RU')} (${percentage}%)`
                    }}
                  >
                    {byGroup.expense.groups.map((_entry: any, index: number) => (
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
      )}
    </div>
  )
}

export default CashFlow

