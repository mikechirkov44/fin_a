import { useState, useEffect } from 'react'
import { balanceService } from '../services/api'
import { format } from 'date-fns'

const Balance = () => {
  const [balance, setBalance] = useState<any>(null)
  const [balanceDate, setBalanceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBalance()
  }, [balanceDate])

  const loadBalance = async () => {
    setLoading(true)
    try {
      const data = await balanceService.getBalance({ balance_date: balanceDate })
      setBalance(data)
    } catch (error) {
      console.error('Error loading balance:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Загрузка...</div>
  if (!balance) return <div>Нет данных</div>

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group">
          <label>Дата баланса</label>
          <input
            type="date"
            value={balanceDate}
            onChange={(e) => setBalanceDate(e.target.value)}
            style={{ maxWidth: '200px' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">АКТИВЫ</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Оборотные активы</strong></td>
              <td className="text-right">{balance.assets.current.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Основные средства</strong></td>
              <td className="text-right">{balance.assets.fixed.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Нематериальные активы</strong></td>
              <td className="text-right">{balance.assets.intangible.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО АКТИВЫ</strong></td>
              <td className="text-right">{balance.assets.total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">ПАССИВЫ</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Краткосрочные обязательства</strong></td>
              <td className="text-right">{balance.liabilities.short_term.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Долгосрочные обязательства</strong></td>
              <td className="text-right">{balance.liabilities.long_term.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО ОБЯЗАТЕЛЬСТВА</strong></td>
              <td className="text-right">{balance.liabilities.total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr>
              <td><strong>Капитал</strong></td>
              <td className="text-right">{balance.equity.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            <tr style={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <td><strong>ИТОГО ПАССИВЫ</strong></td>
              <td className="text-right">{(balance.liabilities.total + balance.equity).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">Денежные средства</div>
        <table>
          <tbody>
            <tr>
              <td><strong>Остаток денежных средств</strong></td>
              <td className="text-right">{balance.cash_balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Balance

