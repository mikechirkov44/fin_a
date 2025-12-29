import { useState, useEffect } from 'react'
import { profitLossService } from '../services/api'
import { format, subMonths } from 'date-fns'

const ProfitLoss = () => {
  const [report, setReport] = useState<any>(null)
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 4), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [startDate, endDate])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await profitLossService.getReport({ start_date: startDate, end_date: endDate })
      setReport(data)
    } catch (error: any) {
      console.error('Error loading profit loss:', error)
      setReport(null)
      if (error.response) {
        // Ошибка загрузки данных обрабатывается в catch блоке
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Загрузка...</div>
  if (!report) {
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
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Нет данных за выбранный период ({startDate} - {endDate})</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>Попробуйте изменить период или добавьте данные в разделах "Реализация" и "Отгрузка"</p>
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
        </div>
      </div>

      <div className="card">
        <div className="card-header">ОТЧЕТ О ПРИБЫЛЯХ И УБЫТКАХ</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Выручка</strong></td>
              <td className="text-right">{report.revenue.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Себестоимость проданных товаров</strong></td>
              <td className="text-right">{report.cost_of_goods_sold.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Валовая прибыль</strong></td>
              <td className="text-right">{report.gross_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность валовой прибыли</td>
              <td className="text-right">{report.gross_margin}%</td>
            </tr>
            <tr>
              <td><strong>Коммерческие расходы</strong></td>
              <td className="text-right">{report.commercial_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Управленческие расходы</strong></td>
              <td className="text-right">{report.administrative_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Прибыль от операционной деятельности</strong></td>
              <td className="text-right">{report.operating_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Прочие доходы</strong></td>
              <td className="text-right">{report.other_income.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Прочие расходы</strong></td>
              <td className="text-right">{report.other_expenses.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>Прибыль до налогообложения</strong></td>
              <td className="text-right">{report.profit_before_tax.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Налоги</strong></td>
              <td className="text-right">{report.taxes.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#d0d0d0', fontWeight: 'bold', fontSize: '14px' }}>
              <td><strong>ЧИСТАЯ ПРИБЫЛЬ</strong></td>
              <td className="text-right">{report.net_profit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Рентабельность чистой прибыли</td>
              <td className="text-right">{report.net_margin}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProfitLoss

