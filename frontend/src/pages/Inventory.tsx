import { useState, useEffect } from 'react'
import { inventoryService, productsService, warehousesService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import Tooltip from '../components/Tooltip'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { format } from 'date-fns'

const Inventory = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [inventory, setInventory] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'turnover'>('inventory')
  const [loading, setLoading] = useState(true)
  
  const transactionValidation = useFormValidation({
    product_id: { required: true, custom: (value) => !value ? 'Выберите товар' : null },
    warehouse_id: { required: true, custom: (value) => !value ? 'Выберите склад' : null },
    quantity: { required: true, min: 0 },
    cost_price: { required: true, min: 0 },
    date: { required: true },
  })
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: 'INCOME',
    product_id: '',
    warehouse_id: '',
    quantity: '',
    cost_price: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  })

  const resetTransactionForm = () => {
    setTransactionFormData({
      transaction_type: 'INCOME',
      product_id: '',
      warehouse_id: '',
      quantity: '',
      cost_price: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
    })
    transactionValidation.clearAllErrors()
  }

  const handleTransactionClose = () => {
    setShowTransactionForm(false)
    resetTransactionForm()
  }

  useEffect(() => {
    if (selectedCompanyId) {
      loadInventory()
      loadTransactions()
      loadProducts()
      loadWarehouses()
    }
  }, [selectedCompanyId])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await inventoryService.getInventory(params)
      setInventory(data)
    } catch (error) {
      console.error('Error loading inventory:', error)
      showError('Ошибка загрузки остатков')
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await inventoryService.getTransactions(params)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const data = await productsService.getProducts()
      setProducts(data.filter((p: any) => p.is_active))
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadWarehouses = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await warehousesService.getWarehouses(params)
      setWarehouses(data)
    } catch (error) {
      console.error('Error loading warehouses:', error)
    }
  }

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transactionValidation.validate(transactionFormData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      await inventoryService.createTransaction({
        ...transactionFormData,
        product_id: parseInt(String(transactionFormData.product_id)),
        warehouse_id: parseInt(String(transactionFormData.warehouse_id)),
        quantity: parseFloat(transactionFormData.quantity),
        cost_price: parseFloat(transactionFormData.cost_price),
      })
      handleTransactionClose()
      showSuccess('Транзакция успешно создана')
      loadInventory()
      loadTransactions()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при создании транзакции')
    }
  }

  const [turnoverData, setTurnoverData] = useState<any[]>([])
  const [loadingTurnover, setLoadingTurnover] = useState(false)

  const loadTurnover = async () => {
    setLoadingTurnover(true)
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      params.start_date = startDate.toISOString().split('T')[0]
      params.end_date = endDate.toISOString().split('T')[0]
      
      const data = await inventoryService.getTurnover(params)
      setTurnoverData(data)
    } catch (error) {
      console.error('Error loading turnover:', error)
    } finally {
      setLoadingTurnover(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'turnover' && selectedCompanyId) {
      loadTurnover()
    }
  }, [activeTab, selectedCompanyId])

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (!showTransactionForm && canWrite(selectedCompanyId)) {
          setShowTransactionForm(true)
          resetTransactionForm()
        }
      },
      description: 'Создать новую транзакцию',
    },
    {
      key: 'Escape',
      action: () => {
        if (showTransactionForm) {
          handleTransactionClose()
        }
      },
      description: 'Закрыть форму',
    },
  ])

  if (!selectedCompanyId) {
    return (
      <div className="card" style={{ 
        padding: '20px', 
        backgroundColor: 'var(--warning-bg, #fff3cd)',
        color: 'var(--warning-text, var(--text-primary))',
        border: '1px solid var(--warning-border, var(--border-color))'
      }}>
        Выберите организацию для просмотра остатков
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление остатками товаров</h2>
        {canWrite(selectedCompanyId) && (
          <button onClick={() => {
            setShowTransactionForm(true)
            resetTransactionForm()
          }} className="primary">
            Создать транзакцию
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: 'none',
            backgroundColor: activeTab === 'inventory' ? '#4a90e2' : '#f0f0f0',
            color: activeTab === 'inventory' ? 'white' : 'black',
            cursor: 'pointer',
          }}
        >
          Остатки
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            border: 'none',
            backgroundColor: activeTab === 'transactions' ? '#4a90e2' : '#f0f0f0',
            color: activeTab === 'transactions' ? 'white' : 'black',
            cursor: 'pointer',
          }}
        >
          Транзакции
        </button>
        <button
          onClick={() => setActiveTab('turnover')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: activeTab === 'turnover' ? '#4a90e2' : '#f0f0f0',
            color: activeTab === 'turnover' ? 'white' : 'black',
            cursor: 'pointer',
          }}
        >
          Оборачиваемость
        </button>
      </div>

      <Modal
        isOpen={showTransactionForm}
        onClose={handleTransactionClose}
        title="Создать транзакцию"
        maxWidth="800px"
      >
        <form onSubmit={handleTransactionSubmit}>
          <div className="form-row">
            <FormField label="Тип транзакции" required>
              <select
                value={transactionFormData.transaction_type}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, transaction_type: e.target.value })
                }}
              >
                <option value="INCOME">Приход</option>
                <option value="OUTCOME">Расход</option>
                <option value="ADJUSTMENT">Корректировка</option>
              </select>
            </FormField>
            <FormField label="Дата" required error={transactionValidation.errors.date}>
              <input
                type="date"
                value={transactionFormData.date}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, date: e.target.value })
                  transactionValidation.clearError('date')
                }}
              />
            </FormField>
          </div>
          <div className="form-row">
            <FormField label="Товар" required error={transactionValidation.errors.product_id}>
              <select
                value={transactionFormData.product_id}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, product_id: e.target.value })
                  transactionValidation.clearError('product_id')
                }}
              >
                <option value="">Выберите товар</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Склад" required error={transactionValidation.errors.warehouse_id}>
              <select
                value={transactionFormData.warehouse_id}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, warehouse_id: e.target.value })
                  transactionValidation.clearError('warehouse_id')
                }}
              >
                <option value="">Выберите склад</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="form-row">
            <FormField label="Количество" required error={transactionValidation.errors.quantity}>
              <input
                type="number"
                step="0.001"
                min="0"
                value={transactionFormData.quantity}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, quantity: e.target.value })
                  transactionValidation.clearError('quantity')
                }}
              />
            </FormField>
            <FormField label="Себестоимость (за единицу)" required error={transactionValidation.errors.cost_price}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={transactionFormData.cost_price}
                onChange={(e) => {
                  setTransactionFormData({ ...transactionFormData, cost_price: e.target.value })
                  transactionValidation.clearError('cost_price')
                }}
              />
            </FormField>
          </div>
          <FormField label="Описание">
            <textarea
              value={transactionFormData.description}
              onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleTransactionClose}>
              Отмена
            </button>
            <button type="submit" className="primary">
              Создать
            </button>
          </div>
        </form>
      </Modal>

      {activeTab === 'inventory' && (
        <div className="card">
          <div className="card-header">Текущие остатки</div>
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Склад</th>
                <th>Количество</th>
                <th>Мин. остаток</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    Нет данных об остатках
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name || `Товар #${item.product_id}`}</td>
                    <td>{item.warehouse_name || `Склад #${item.warehouse_id}`}</td>
                    <td>{parseFloat(item.quantity).toFixed(3)}</td>
                    <td>{parseFloat(item.min_stock_level).toFixed(3)}</td>
                    <td>
                      {parseFloat(item.quantity) < parseFloat(item.min_stock_level) ? (
                        <span style={{ color: 'red', fontWeight: 'bold' }}>Низкий остаток</span>
                      ) : (
                        <span style={{ color: 'green' }}>Норма</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-header">История транзакций</div>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Товар</th>
                <th>Склад</th>
                <th>Количество</th>
                <th>Себестоимость</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    Нет транзакций
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>
                      {transaction.transaction_type === 'INCOME' && 'Приход'}
                      {transaction.transaction_type === 'OUTCOME' && 'Расход'}
                      {transaction.transaction_type === 'ADJUSTMENT' && 'Корректировка'}
                    </td>
                    <td>{transaction.product_name || `Товар #${transaction.product_id}`}</td>
                    <td>{transaction.warehouse_name || `Склад #${transaction.warehouse_id}`}</td>
                    <td>{parseFloat(transaction.quantity).toFixed(3)}</td>
                    <td>{parseFloat(transaction.cost_price).toFixed(2)} ₽</td>
                    <td>{transaction.description || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'turnover' && (
        <div className="card">
          <div className="card-header">Анализ оборачиваемости (последние 3 месяца)</div>
          {loadingTurnover ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Средний остаток</th>
                  <th>Продано (шт)</th>
                  <th>Выручка</th>
                  <th>COGS</th>
                  <th>Коэф. оборачиваемости</th>
                  <th>Дни оборачиваемости</th>
                </tr>
              </thead>
              <tbody>
                {turnoverData.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                      Нет данных для анализа
                    </td>
                  </tr>
                ) : (
                  turnoverData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name || `Товар #${item.product_id}`}</td>
                      <td>{item.average_inventory.toFixed(3)}</td>
                      <td>{item.sales_quantity.toFixed(3)}</td>
                      <td>{item.sales_revenue.toFixed(2)} ₽</td>
                      <td>{item.cogs.toFixed(2)} ₽</td>
                      <td>{item.turnover_ratio.toFixed(2)}</td>
                      <td>{item.days_turnover.toFixed(1)} дней</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default Inventory

