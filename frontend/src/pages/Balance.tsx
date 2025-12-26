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
            {balance.assets.detail?.current && balance.assets.detail.current.length > 0 && (
              balance.assets.detail.current.map((item: any) => (
                <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                  <td style={{ paddingLeft: '20px' }}>• {item.name}</td>
                  <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
              ))
            )}
            {balance.assets.receivable > 0 && (
              <>
                <tr>
                  <td style={{ paddingLeft: '20px' }}><strong>Дебиторская задолженность</strong></td>
                  <td className="text-right">{balance.assets.receivable.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
                {balance.assets.detail?.receivable && balance.assets.detail.receivable.length > 0 && (
                  balance.assets.detail.receivable.map((item: any) => (
                    <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                      <td style={{ paddingLeft: '40px' }}>• {item.name}</td>
                      <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    </tr>
                  ))
                )}
              </>
            )}
            <tr>
              <td><strong>Основные средства</strong></td>
              <td className="text-right">{balance.assets.fixed.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            {balance.assets.detail?.fixed && balance.assets.detail.fixed.length > 0 && (
              balance.assets.detail.fixed.map((item: any) => (
                <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                  <td style={{ paddingLeft: '20px' }}>• {item.name}</td>
                  <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
              ))
            )}
            <tr>
              <td><strong>Нематериальные активы</strong></td>
              <td className="text-right">{balance.assets.intangible.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            {balance.assets.detail?.intangible && balance.assets.detail.intangible.length > 0 && (
              balance.assets.detail.intangible.map((item: any) => (
                <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                  <td style={{ paddingLeft: '20px' }}>• {item.name}</td>
                  <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
              ))
            )}
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
            {balance.liabilities.detail?.short_term && balance.liabilities.detail.short_term.length > 0 && (
              balance.liabilities.detail.short_term.map((item: any) => (
                <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                  <td style={{ paddingLeft: '20px' }}>• {item.name}</td>
                  <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
              ))
            )}
            {balance.liabilities.payable > 0 && (
              <>
                <tr>
                  <td style={{ paddingLeft: '20px' }}><strong>Кредиторская задолженность</strong></td>
                  <td className="text-right">{balance.liabilities.payable.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
                {balance.liabilities.detail?.payable && balance.liabilities.detail.payable.length > 0 && (
                  balance.liabilities.detail.payable.map((item: any) => (
                    <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                      <td style={{ paddingLeft: '40px' }}>• {item.name}</td>
                      <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                    </tr>
                  ))
                )}
              </>
            )}
            <tr>
              <td><strong>Долгосрочные обязательства</strong></td>
              <td className="text-right">{balance.liabilities.long_term.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
            </tr>
            {balance.liabilities.detail?.long_term && balance.liabilities.detail.long_term.length > 0 && (
              balance.liabilities.detail.long_term.map((item: any) => (
                <tr key={item.id} style={{ fontSize: '12px', color: '#666' }}>
                  <td style={{ paddingLeft: '20px' }}>• {item.name}</td>
                  <td className="text-right">{item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                </tr>
              ))
            )}
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

