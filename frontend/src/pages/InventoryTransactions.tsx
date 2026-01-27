import { useState, useEffect } from 'react'
import { inventoryService, productsService, warehousesService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { useFormValidation } from '../hooks/useFormValidation'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { format } from 'date-fns'

const InventoryTransactions = () => {
  const { selectedCompanyId, canWrite } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [transactions, setTransactions] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
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
    setEditingTransaction(null)
    transactionValidation.clearAllErrors()
  }

  const handleTransactionClose = () => {
    setShowTransactionForm(false)
    resetTransactionForm()
  }

  useEffect(() => {
    if (selectedCompanyId) {
      loadTransactions()
      loadProducts()
      loadWarehouses()
    }
  }, [selectedCompanyId])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await inventoryService.getTransactions(params)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      showError('Ошибка загрузки транзакций')
    } finally {
      setLoading(false)
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

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction)
    setTransactionFormData({
      transaction_type: transaction.transaction_type,
      product_id: String(transaction.product_id),
      warehouse_id: String(transaction.warehouse_id),
      quantity: String(transaction.quantity),
      cost_price: String(transaction.cost_price),
      date: transaction.date,
      description: transaction.description || '',
    })
    setShowTransactionForm(true)
  }

  const handleDelete = async (transaction: any) => {
    const confirmed = await confirm(
      'Удаление транзакции',
      `Вы уверены, что хотите удалить транзакцию от ${transaction.date}? Это действие откатит изменения остатков.`
    )
    if (!confirmed) return

    try {
      await inventoryService.deleteTransaction(transaction.id)
      showSuccess('Транзакция успешно удалена')
      loadTransactions()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при удалении транзакции')
    }
  }

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transactionValidation.validate(transactionFormData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      const data = {
        ...transactionFormData,
        product_id: parseInt(String(transactionFormData.product_id)),
        warehouse_id: parseInt(String(transactionFormData.warehouse_id)),
        quantity: parseFloat(transactionFormData.quantity),
        cost_price: parseFloat(transactionFormData.cost_price),
      }

      if (editingTransaction) {
        await inventoryService.updateTransaction(editingTransaction.id, data)
        showSuccess('Транзакция успешно обновлена')
      } else {
        await inventoryService.createTransaction(data)
        showSuccess('Транзакция успешно создана')
      }
      
      handleTransactionClose()
      loadTransactions()
    } catch (error: any) {
      showError(error.response?.data?.detail || `Ошибка при ${editingTransaction ? 'обновлении' : 'создании'} транзакции`)
    }
  }

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
        Выберите организацию для просмотра транзакций
      </div>
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Отгрузки и поступления товаров</h2>
        {canWrite(selectedCompanyId) && (
          <button onClick={() => {
            setShowTransactionForm(true)
            resetTransactionForm()
          }} className="primary">
            Создать транзакцию
          </button>
        )}
      </div>

      <Modal
        isOpen={showTransactionForm}
        onClose={handleTransactionClose}
        title={editingTransaction ? 'Редактировать транзакцию' : 'Создать транзакцию'}
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
              {editingTransaction ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>

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
              {canWrite(selectedCompanyId) && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={canWrite(selectedCompanyId) ? 8 : 7} style={{ textAlign: 'center', padding: '20px' }}>
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
                  {canWrite(selectedCompanyId) && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(transaction)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: 'var(--primary-color, #4a90e2)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDelete(transaction)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            backgroundColor: 'var(--danger-color, #dc3545)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InventoryTransactions
