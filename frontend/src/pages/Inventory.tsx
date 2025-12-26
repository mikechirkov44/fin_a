import { useState, useEffect } from 'react'
import { inventoryService, productsService, warehousesService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Inventory = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const [inventory, setInventory] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'turnover'>('inventory')
  const [transactionFormData, setTransactionFormData] = useState({
    transaction_type: 'INCOME',
    product_id: 0,
    warehouse_id: 0,
    quantity: '',
    cost_price: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  })

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
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await inventoryService.getInventory(params)
      setInventory(data)
    } catch (error) {
      console.error('Error loading inventory:', error)
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
    try {
      await inventoryService.createTransaction({
        ...transactionFormData,
        quantity: parseFloat(transactionFormData.quantity),
        cost_price: parseFloat(transactionFormData.cost_price),
      })
      setShowTransactionForm(false)
      setTransactionFormData({
        transaction_type: 'INCOME',
        product_id: 0,
        warehouse_id: 0,
        quantity: '',
        cost_price: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      })
      loadInventory()
      loadTransactions()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка при создании транзакции')
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

  if (!selectedCompanyId) {
    return (
      <div className="card" style={{ padding: '20px', backgroundColor: '#fff3cd' }}>
        Выберите организацию для просмотра остатков
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Управление остатками товаров</h2>
        {canWrite(selectedCompanyId) && (
          <button onClick={() => setShowTransactionForm(true)}>
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

      {showTransactionForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">Создать транзакцию</div>
          <form onSubmit={handleTransactionSubmit} style={{ padding: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label>Тип транзакции:</label>
              <select
                value={transactionFormData.transaction_type}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, transaction_type: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="INCOME">Приход</option>
                <option value="OUTCOME">Расход</option>
                <option value="ADJUSTMENT">Корректировка</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Товар:</label>
              <select
                value={transactionFormData.product_id}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, product_id: parseInt(e.target.value, 10) })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="0">Выберите товар</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Склад:</label>
              <select
                value={transactionFormData.warehouse_id}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, warehouse_id: parseInt(e.target.value, 10) })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                <option value="0">Выберите склад</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Количество:</label>
              <input
                type="number"
                step="0.001"
                value={transactionFormData.quantity}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, quantity: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Себестоимость (за единицу):</label>
              <input
                type="number"
                step="0.01"
                value={transactionFormData.cost_price}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, cost_price: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Дата:</label>
              <input
                type="date"
                value={transactionFormData.date}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Описание:</label>
              <textarea
                value={transactionFormData.description}
                onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit">Создать</button>
              <button type="button" onClick={() => setShowTransactionForm(false)}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

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

