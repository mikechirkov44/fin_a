import { useState, useEffect } from 'react'
import { profitLossAnalysisService } from '../services/api'
import { format, subMonths } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import './AnalysisInsights.css'

const ProfitLossAnalysis = () => {
  const { companies } = useAuth()
  const [report, setReport] = useState<any>(null)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate, selectedCompanyId])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: any = { start_date: startDate, end_date: endDate }
      if (selectedCompanyId) {
        params.company_id = parseInt(selectedCompanyId)
      }
      const data = await profitLossAnalysisService.getAnalysis(params)
      setReport(data)
    } catch (error) {
      console.error('Error loading profit loss analysis:', error)
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
            <label>Организация</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Все организации</option>
              {companies.filter(c => c.is_active).map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
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
              <th>Вид деятельности</th>
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
                -{report.total_direct_production_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.total_direct_production_costs / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Всего производственные расходы</strong></td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{(report.total_marketplace_costs + report.total_direct_production_costs).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? (((report.total_marketplace_costs + report.total_direct_production_costs) / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Валовая прибыль по направлениям */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Валовая прибыль по направлениям (ВП1)</div>
        <table>
          <thead>
            <tr>
              <th>Канал</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">Затраты на MP</th>
              <th className="text-right">Прямые производственные</th>
              <th className="text-right">Валовая прибыль</th>
              <th className="text-right">Рентабельность ВП, %</th>
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
                <td className="text-right" style={{ color: '#e74c3c' }}>
                  -{channel.direct_production_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right" style={{ color: channel.gross_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                  {channel.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                </td>
                <td className="text-right">{channel.gross_margin}%</td>
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
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_direct_production_costs.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right" style={{ color: report.total_gross_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.total_gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">{report.gross_margin}%</td>
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
              <td><strong>Административные расходы</strong></td>
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
              <td style={{ paddingLeft: '20px' }}>Аренда офис</td>
              <td className="text-right">-</td>
              <td className="text-right">-</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>ЗП управляющий</td>
              <td className="text-right">-</td>
              <td className="text-right">-</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Бухгалтер, офисные расходы и т.д.</td>
              <td className="text-right">-</td>
              <td className="text-right">-</td>
            </tr>
            <tr>
              <td><strong>Коммерческие расходы</strong></td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.commercial_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
              <td className="text-right">
                {report.total_revenue > 0 
                  ? ((report.commercial_expenses / report.total_revenue) * 100).toFixed(2)
                  : '0.00'}%
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Маркетинг, реклама, доставка и т.д.</td>
              <td className="text-right">-</td>
              <td className="text-right">-</td>
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
        <div className="card-header">Операционная прибыль (ОП, EBITDA)</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Валовая прибыль</strong></td>
              <td className="text-right">
                {report.total_gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Косвенные расходы</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.total_indirect_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ОПЕРАЦИОННАЯ ПРИБЫЛЬ (EBITDA)</strong></td>
              <td className="text-right" style={{ color: report.operating_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.operating_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность по ОП</td>
              <td className="text-right">{report.operating_margin}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Расходы ниже EBITDA */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Расходы ниже EBITDA</div>
        <table>
          <tbody>
            <tr>
              <td>Налоги</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.taxes.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td>Амортизация</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{report.other_expenses_below_ebitda.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Чистая прибыль */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Чистая прибыль</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Операционная прибыль (EBITDA)</strong></td>
              <td className="text-right">
                {report.operating_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Расходы ниже EBITDA</td>
              <td className="text-right" style={{ color: '#e74c3c' }}>
                -{(report.taxes + report.other_expenses_below_ebitda).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr style={{ backgroundColor: '#d0d0d0', fontWeight: 'bold', fontSize: '14px' }}>
              <td><strong>ЧИСТАЯ ПРИБЫЛЬ</strong></td>
              <td className="text-right" style={{ color: report.net_profit >= 0 ? '#27ae60' : '#e74c3c' }}>
                {report.net_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              </td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность по ЧП</td>
              <td className="text-right">{report.net_margin}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Графики */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card">
          <div className="card-header">Валовая прибыль по каналам</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.channels.filter((c: any) => c.revenue > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
              <Legend />
              <Bar dataKey="gross_profit" fill="#27ae60" name="Валовая прибыль" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">Рентабельность ВП по каналам</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.channels.filter((c: any) => c.revenue > 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toFixed(2) + '%'} />
              <Legend />
              <Bar dataKey="gross_margin" fill="#4a90e2" name="Рентабельность ВП, %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Выводы и рекомендации */}
      {(report.insights && report.insights.length > 0) || (report.recommendations && report.recommendations.length > 0) ? (
        <div className="insights-container">
          {report.insights && report.insights.length > 0 && (
            <div className="insights-card insights">
              <div className="insights-header insights">
                <span className="insights-header-icon">📊</span>
                <span>Выводы по цифрам</span>
              </div>
              <div className="insights-content">
                <ul className="insights-list">
                  {report.insights.map((insight: string, index: number) => {
                    // Определяем тип вывода по содержимому
                    let insightType = 'info'
                    if (insight.includes('🔴') || insight.includes('отрицательная') || insight.includes('убыточен') || insight.includes('Критическая')) {
                      insightType = 'critical'
                    } else if (insight.includes('⚠️') || insight.includes('Низкая') || insight.includes('Высокая')) {
                      insightType = 'warning'
                    } else if (insight.includes('✅') || insight.includes('Хорошая') || insight.includes('положительная')) {
                      insightType = 'success'
                    } else if (insight.includes('⭐') || insight.includes('Наиболее')) {
                      insightType = 'highlight'
                    }
                    
                    return (
                      <li key={index} className={insightType}>
                        {insight}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
          
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="insights-card recommendations">
              <div className="insights-header recommendations">
                <span className="insights-header-icon">💡</span>
                <span>Рекомендации</span>
              </div>
              <div className="insights-content">
                <ol className="recommendations-list">
                  {report.recommendations.map((recommendation: string, index: number) => {
                    // Определяем критичность рекомендации
                    const isCritical = recommendation.includes('Критическая') || recommendation.includes('Срочно')
                    
                    return (
                      <li key={index} className={isCritical ? 'critical' : ''}>
                        {recommendation}
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default ProfitLossAnalysis
