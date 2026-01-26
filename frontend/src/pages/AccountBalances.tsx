import { useState, useEffect } from 'react'
import { bankCashService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { format } from 'date-fns'

const AccountBalances = () => {
  const { selectedCompanyId } = useAuth()
  const { showError } = useToast()
  const [balances, setBalances] = useState<any>(null)
  const [balanceDate, setBalanceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadBalances()
  }, [balanceDate, selectedCompanyId])

  const loadBalances = async () => {
    setLoading(true)
    try {
      const params: any = {
        balance_date: balanceDate,
      }
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await bankCashService.getAccountBalances(params)
      setBalances(data)
    } catch (error) {
      console.error('Error loading account balances:', error)
      showError('Ошибка загрузки остатков на счетах')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <LoadingSpinner message="Загрузка остатков на счетах..." />
      </div>
    )
  }

  if (!balances) {
    return (
      <EmptyState
        icon="💰"
        title="Нет данных"
        message="Не удалось загрузить остатки на счетах"
      />
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group">
          <label>Дата остатков</label>
          <input
            type="date"
            value={balanceDate}
            onChange={(e) => setBalanceDate(e.target.value)}
            style={{ maxWidth: '200px' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">Остатки на счетах на {new Date(balanceDate).toLocaleDateString('ru-RU')}</div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Счет</th>
                <th style={{ textAlign: 'right' }}>Остаток</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {balances.accounts && balances.accounts.length > 0 ? (
                balances.accounts.map((account: any) => (
                  <tr key={account.account_id}>
                    <td><strong>{account.account_name}</strong></td>
                    <td className="text-right" style={{ 
                      color: account.balance >= 0 ? 'var(--success-color, #27ae60)' : 'var(--danger-color, #e74c3c)',
                      fontWeight: 'bold'
                    }}>
                      {account.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                    </td>
                    <td style={{ color: '#666', fontSize: '14px' }}>
                      {account.description || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      icon="💰"
                      title="Нет счетов"
                      message="Не найдено активных счетов"
                    />
                  </td>
                </tr>
              )}
              {balances.accounts && balances.accounts.length > 0 && (
                <tr style={{ 
                  backgroundColor: 'var(--bg-secondary, #f5f5f5)',
                  fontWeight: 'bold',
                  borderTop: '2px solid var(--border-color, #ddd)'
                }}>
                  <td><strong>ИТОГО</strong></td>
                  <td className="text-right" style={{ 
                    color: balances.total_balance >= 0 ? 'var(--success-color, #27ae60)' : 'var(--danger-color, #e74c3c)',
                    fontSize: '16px'
                  }}>
                    {balances.total_balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AccountBalances
