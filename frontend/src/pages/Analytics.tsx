import { useState, useEffect } from 'react'
import { analyticsService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { format, subMonths } from 'date-fns'
import { BarChart } from '../components/charts'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import './Analytics.css'

const Analytics = () => {
  const { selectedCompanyId } = useAuth()
  const [activeTab, setActiveTab] = useState<'forecast' | 'comparison' | 'abcxyz'>('forecast')
  const [loading, setLoading] = useState(false)
  
  // Прогнозирование
  const [forecastMonths, setForecastMonths] = useState(3)
  const [revenueForecast, setRevenueForecast] = useState<any>(null)
  
  // Сравнение периодов
  const [period1Start, setPeriod1Start] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [period1End, setPeriod1End] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [period2Start, setPeriod2Start] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [period2End, setPeriod2End] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [comparison, setComparison] = useState<any>(null)
  
  // ABC/XYZ анализ
  const [abcXyzData, setAbcXyzData] = useState<any>(null)
  const [analysisStartDate, setAnalysisStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [analysisEndDate, setAnalysisEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (activeTab === 'forecast') {
      loadRevenueForecast()
    } else if (activeTab === 'comparison') {
      loadComparison()
    } else if (activeTab === 'abcxyz') {
      loadAbcXyzAnalysis()
    }
  }, [activeTab, forecastMonths, period1Start, period1End, period2Start, period2End, analysisStartDate, analysisEndDate, selectedCompanyId])

  const loadRevenueForecast = async () => {
    setLoading(true)
    try {
      const data = await analyticsService.forecastRevenue({
        months: forecastMonths,
        company_id: selectedCompanyId
      })
      setRevenueForecast(data)
    } catch (error) {
      console.error('Error loading revenue forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadComparison = async () => {
    setLoading(true)
    try {
      const data = await analyticsService.comparePeriods({
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
        company_id: selectedCompanyId
      })
      setComparison(data)
    } catch (error) {
      console.error('Error loading comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAbcXyzAnalysis = async () => {
    setLoading(true)
    try {
      const data = await analyticsService.abcXyzAnalysis({
        company_id: selectedCompanyId,
        start_date: analysisStartDate,
        end_date: analysisEndDate
      })
      setAbcXyzData(data)
    } catch (error) {
      console.error('Error loading ABC/XYZ analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="analytics-page">
      <div className="analytics-tabs">
        <button
          className={activeTab === 'forecast' ? 'active' : ''}
          onClick={() => setActiveTab('forecast')}
        >
          Прогнозирование
        </button>
        <button
          className={activeTab === 'comparison' ? 'active' : ''}
          onClick={() => setActiveTab('comparison')}
        >
          Сравнение периодов
        </button>
        <button
          className={activeTab === 'abcxyz' ? 'active' : ''}
          onClick={() => setActiveTab('abcxyz')}
        >
          ABC/XYZ анализ
        </button>
      </div>

      {loading && <LoadingSpinner />}

      {activeTab === 'forecast' && (
        <div className="analytics-content">
          <div className="card">
            <div className="card-header">Прогноз выручки</div>
            <div style={{ padding: '16px' }}>
              <div className="form-group">
                <label>Период прогноза (месяцев):</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={forecastMonths}
                  onChange={(e) => setForecastMonths(parseInt(e.target.value) || 3)}
                  style={{ maxWidth: '100px' }}
                />
              </div>
            </div>
            {revenueForecast && revenueForecast.forecast && revenueForecast.forecast.length > 0 ? (
              <>
                <div style={{ padding: '16px' }}>
                  <p>Средний рост: <strong>{revenueForecast.average_growth}%</strong></p>
                  <p>Выручка за последний месяц: <strong>{revenueForecast.last_month_revenue.toLocaleString('ru-RU')} ₽</strong></p>
                </div>
                <BarChart 
                  data={{
                    labels: revenueForecast.forecast.map((item: any) => item.month),
                    series: [revenueForecast.forecast.map((item: any) => item.forecasted_revenue)]
                  }}
                  height={300}
                  colors={['#4a90e2']}
                  options={{
                    axisY: {
                      labelInterpolationFnc: (value: number) => value.toLocaleString('ru-RU') + ' ₽'
                    }
                  }}
                />
                <div className="table-container" style={{ marginTop: '20px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Месяц</th>
                        <th>Прогноз выручки</th>
                        <th>Рост</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueForecast.forecast.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{item.month}</td>
                          <td className="text-right">{item.forecasted_revenue.toLocaleString('ru-RU')} ₽</td>
                          <td className="text-right">{item.growth_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState icon="📈" title="Нет данных" message="Недостаточно данных для прогнозирования" />
            )}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className="analytics-content">
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Период 1 - Начало</label>
                <input type="date" value={period1Start} onChange={(e) => setPeriod1Start(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Период 1 - Конец</label>
                <input type="date" value={period1End} onChange={(e) => setPeriod1End(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Период 2 - Начало</label>
                <input type="date" value={period2Start} onChange={(e) => setPeriod2Start(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Период 2 - Конец</label>
                <input type="date" value={period2End} onChange={(e) => setPeriod2End(e.target.value)} />
              </div>
            </div>
          </div>

          {comparison && (
            <div className="card">
              <div className="card-header">Сравнение периодов</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Показатель</th>
                      <th>Период 1</th>
                      <th>Период 2</th>
                      <th>Изменение</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Выручка</strong></td>
                      <td className="text-right">{comparison.period1.revenue.toLocaleString('ru-RU')} ₽</td>
                      <td className="text-right">{comparison.period2.revenue.toLocaleString('ru-RU')} ₽</td>
                      <td className={`text-right ${comparison.changes.revenue >= 0 ? 'positive' : 'negative'}`}>
                        {comparison.changes.revenue >= 0 ? '+' : ''}{comparison.changes.revenue}%
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Расходы</strong></td>
                      <td className="text-right">{comparison.period1.expenses.toLocaleString('ru-RU')} ₽</td>
                      <td className="text-right">{comparison.period2.expenses.toLocaleString('ru-RU')} ₽</td>
                      <td className={`text-right ${comparison.changes.expenses >= 0 ? 'negative' : 'positive'}`}>
                        {comparison.changes.expenses >= 0 ? '+' : ''}{comparison.changes.expenses}%
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Прибыль</strong></td>
                      <td className="text-right">{comparison.period1.profit.toLocaleString('ru-RU')} ₽</td>
                      <td className="text-right">{comparison.period2.profit.toLocaleString('ru-RU')} ₽</td>
                      <td className={`text-right ${comparison.changes.profit >= 0 ? 'positive' : 'negative'}`}>
                        {comparison.changes.profit >= 0 ? '+' : ''}{comparison.changes.profit}%
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Рентабельность</strong></td>
                      <td className="text-right">{comparison.period1.margin.toFixed(2)}%</td>
                      <td className="text-right">{comparison.period2.margin.toFixed(2)}%</td>
                      <td className={`text-right ${comparison.changes.margin >= 0 ? 'positive' : 'negative'}`}>
                        {comparison.changes.margin >= 0 ? '+' : ''}{comparison.changes.margin.toFixed(2)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'abcxyz' && (
        <div className="analytics-content">
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Начало периода</label>
                <input type="date" value={analysisStartDate} onChange={(e) => setAnalysisStartDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Конец периода</label>
                <input type="date" value={analysisEndDate} onChange={(e) => setAnalysisEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {abcXyzData && abcXyzData.analysis && abcXyzData.analysis.length > 0 ? (
            <div className="card">
              <div className="card-header">ABC/XYZ анализ товаров</div>
              <div style={{ padding: '16px' }}>
                <p>Всего товаров: <strong>{abcXyzData.total_products}</strong></p>
                <p>Общая выручка: <strong>{abcXyzData.total_revenue.toLocaleString('ru-RU')} ₽</strong></p>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Товар</th>
                      <th>SKU</th>
                      <th>Выручка</th>
                      <th>% от общей</th>
                      <th>ABC</th>
                      <th>XYZ</th>
                      <th>Класс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcXyzData.analysis.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td>{item.sku}</td>
                        <td className="text-right">{item.revenue.toLocaleString('ru-RU')} ₽</td>
                        <td className="text-right">{item.revenue_percent.toFixed(2)}%</td>
                        <td className={`abc-class abc-${item.abc_class.toLowerCase()}`}>{item.abc_class}</td>
                        <td className={`xyz-class xyz-${item.xyz_class.toLowerCase()}`}>{item.xyz_class}</td>
                        <td className="abcxyz-class">{item.abc_xyz}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState icon="📊" title="Нет данных" message="Недостаточно данных для анализа" />
          )}
        </div>
      )}
    </div>
  )
}

export default Analytics

