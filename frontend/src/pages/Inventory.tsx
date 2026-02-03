import { useState, useEffect } from 'react'
import { inventoryService, productsService, warehousesService, suppliersService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useFormValidation } from '../hooks/useFormValidation'
import FormField from '../components/FormField'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { Button, Input, Select } from '../components/ui'
import { HiOutlinePlus, HiOutlineArrowRight, HiOutlineTrash } from 'react-icons/hi2'
import { format } from 'date-fns'

interface TransactionItem {
  product_id: string
  quantity: string
  cost_price: string
}

const Inventory = () => {
  const { selectedCompanyId } = useAuth()
  const { showSuccess, showError } = useToast()
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  
  // Модальные окна
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showOutcomeForm, setShowOutcomeForm] = useState(false)
  const [showTransferForm, setShowTransferForm] = useState(false)
  
  // Валидация
  const incomeValidation = useFormValidation({
    date: { required: true },
    warehouse_id: { required: true },
    supplier_id: { required: true },
  })
  
  const outcomeValidation = useFormValidation({
    date: { required: true },
    warehouse_id: { required: true },
  })
  
  const transferValidation = useFormValidation({
    date: { required: true },
    from_warehouse_id: { required: true },
    to_warehouse_id: { required: true },
  })
  
  // Формы
  const [incomeFormData, setIncomeFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    warehouse_id: '',
    supplier_id: '',
    description: '',
    items: [] as TransactionItem[],
  })
  
  const [outcomeFormData, setOutcomeFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    warehouse_id: '',
    description: '',
    items: [] as TransactionItem[],
  })
  
  const [transferFormData, setTransferFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    from_warehouse_id: '',
    to_warehouse_id: '',
    description: '',
    items: [] as TransactionItem[],
  })
  
  useEffect(() => {
    if (selectedCompanyId) {
      loadInventory()
      loadProducts()
      loadWarehouses()
      loadSuppliers()
    }
  }, [selectedCompanyId])
  
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
      setWarehouses(data.filter((w: any) => w.is_active !== false))
    } catch (error) {
      console.error('Error loading warehouses:', error)
    }
  }
  
  const loadSuppliers = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) {
        params.company_id = selectedCompanyId
      }
      const data = await suppliersService.getSuppliers(params)
      setSuppliers(data.filter((s: any) => s.is_active !== false))
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

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

  // Обработчики для поступления
  const addIncomeItem = () => {
    setIncomeFormData({
      ...incomeFormData,
      items: [...incomeFormData.items, { product_id: '', quantity: '1', cost_price: '0' }],
    })
  }
  
  const removeIncomeItem = (index: number) => {
    setIncomeFormData({
      ...incomeFormData,
      items: incomeFormData.items.filter((_, i) => i !== index),
    })
  }
  
  const updateIncomeItem = (index: number, field: keyof TransactionItem, value: string) => {
    const newItems = [...incomeFormData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Автоматически подставляем себестоимость из товара
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product && (!newItems[index].cost_price || newItems[index].cost_price === '0')) {
        newItems[index].cost_price = product.cost_price?.toString() || '0'
      }
    }
    
    setIncomeFormData({ ...incomeFormData, items: newItems })
  }
  
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!incomeValidation.validate(incomeFormData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    if (!incomeFormData.items || incomeFormData.items.length === 0) {
      showError('Добавьте хотя бы один товар')
      return
    }
    
    try {
      // Создаем транзакции для каждого товара
      for (const item of incomeFormData.items) {
        if (!item.product_id || !item.quantity || !item.cost_price) {
          showError('Заполните все поля для всех товаров')
          return
        }
        
        await inventoryService.createTransaction({
          transaction_type: 'INCOME',
          product_id: parseInt(item.product_id),
          warehouse_id: parseInt(incomeFormData.warehouse_id),
          quantity: parseFloat(item.quantity),
          cost_price: parseFloat(item.cost_price),
          date: incomeFormData.date,
          document_type: 'INCOME',
          description: incomeFormData.description || `Поступление от поставщика #${incomeFormData.supplier_id}`,
        })
      }
      
      showSuccess('Товары успешно оприходованы')
      setShowIncomeForm(false)
      resetIncomeForm()
      loadInventory()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при оприходовании товаров')
    }
  }
  
  const resetIncomeForm = () => {
    setIncomeFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      warehouse_id: '',
      supplier_id: '',
      description: '',
      items: [],
    })
    incomeValidation.clearAllErrors()
  }
  
  // Обработчики для расхода
  const addOutcomeItem = () => {
    setOutcomeFormData({
      ...outcomeFormData,
      items: [...outcomeFormData.items, { product_id: '', quantity: '1', cost_price: '0' }],
    })
  }
  
  const removeOutcomeItem = (index: number) => {
    setOutcomeFormData({
      ...outcomeFormData,
      items: outcomeFormData.items.filter((_, i) => i !== index),
    })
  }
  
  const updateOutcomeItem = (index: number, field: keyof TransactionItem, value: string) => {
    const newItems = [...outcomeFormData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Автоматически подставляем себестоимость из товара
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product && (!newItems[index].cost_price || newItems[index].cost_price === '0')) {
        newItems[index].cost_price = product.cost_price?.toString() || '0'
      }
    }
    
    setOutcomeFormData({ ...outcomeFormData, items: newItems })
  }
  
  const handleOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!outcomeValidation.validate(outcomeFormData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    if (!outcomeFormData.items || outcomeFormData.items.length === 0) {
      showError('Добавьте хотя бы один товар')
      return
    }
    
    try {
      // Создаем транзакции для каждого товара
      for (const item of outcomeFormData.items) {
        if (!item.product_id || !item.quantity || !item.cost_price) {
          showError('Заполните все поля для всех товаров')
          return
        }
        
        await inventoryService.createTransaction({
          transaction_type: 'OUTCOME',
          product_id: parseInt(item.product_id),
          warehouse_id: parseInt(outcomeFormData.warehouse_id),
          quantity: parseFloat(item.quantity),
          cost_price: parseFloat(item.cost_price),
          date: outcomeFormData.date,
          document_type: 'OUTCOME',
          description: outcomeFormData.description || 'Списание товаров',
        })
      }
      
      showSuccess('Товары успешно списаны')
      setShowOutcomeForm(false)
      resetOutcomeForm()
      loadInventory()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при списании товаров')
    }
  }
  
  const resetOutcomeForm = () => {
    setOutcomeFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      warehouse_id: '',
      description: '',
      items: [],
    })
    outcomeValidation.clearAllErrors()
  }
  
  // Обработчики для перемещения
  const addTransferItem = () => {
    setTransferFormData({
      ...transferFormData,
      items: [...transferFormData.items, { product_id: '', quantity: '1', cost_price: '0' }],
    })
  }
  
  const removeTransferItem = (index: number) => {
    setTransferFormData({
      ...transferFormData,
      items: transferFormData.items.filter((_, i) => i !== index),
    })
  }
  
  const updateTransferItem = (index: number, field: keyof TransactionItem, value: string) => {
    const newItems = [...transferFormData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Автоматически подставляем себестоимость из товара
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value))
      if (product && (!newItems[index].cost_price || newItems[index].cost_price === '0')) {
        newItems[index].cost_price = product.cost_price?.toString() || '0'
      }
    }
    
    setTransferFormData({ ...transferFormData, items: newItems })
  }
  
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transferValidation.validate(transferFormData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    if (transferFormData.from_warehouse_id === transferFormData.to_warehouse_id) {
      showError('Склад-отправитель и склад-получатель не могут быть одинаковыми')
      return
    }
    
    if (!transferFormData.items || transferFormData.items.length === 0) {
      showError('Добавьте хотя бы один товар')
      return
    }
    
    try {
      // Создаем две транзакции для каждого товара: OUTCOME со склада-отправителя и INCOME на склад-получателя
      for (const item of transferFormData.items) {
        if (!item.product_id || !item.quantity || !item.cost_price) {
          showError('Заполните все поля для всех товаров')
          return
        }
        
        const quantity = parseFloat(item.quantity)
        const costPrice = parseFloat(item.cost_price)
        
        // Сначала списание со склада-отправителя
        await inventoryService.createTransaction({
          transaction_type: 'OUTCOME',
          product_id: parseInt(item.product_id),
          warehouse_id: parseInt(transferFormData.from_warehouse_id),
          quantity: quantity,
          cost_price: costPrice,
          date: transferFormData.date,
          document_type: 'TRANSFER',
          description: transferFormData.description || `Перемещение на склад #${transferFormData.to_warehouse_id}`,
        })
        
        // Затем приход на склад-получатель
        await inventoryService.createTransaction({
          transaction_type: 'INCOME',
          product_id: parseInt(item.product_id),
          warehouse_id: parseInt(transferFormData.to_warehouse_id),
          quantity: quantity,
          cost_price: costPrice,
          date: transferFormData.date,
          document_type: 'TRANSFER',
          description: transferFormData.description || `Перемещение со склада #${transferFormData.from_warehouse_id}`,
        })
      }
      
      showSuccess('Товары успешно перемещены')
      setShowTransferForm(false)
      resetTransferForm()
      loadInventory()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка при перемещении товаров')
    }
  }
  
  const resetTransferForm = () => {
    setTransferFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      from_warehouse_id: '',
      to_warehouse_id: '',
      description: '',
      items: [],
    })
    transferValidation.clearAllErrors()
  }

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

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Остатки</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" icon={<HiOutlinePlus />} onClick={() => { setShowIncomeForm(true); resetIncomeForm() }}>
            Поступление
          </Button>
          <Button variant="secondary" icon={<HiOutlinePlus />} onClick={() => { setShowOutcomeForm(true); resetOutcomeForm() }}>
            Расход
          </Button>
          <Button variant="secondary" icon={<HiOutlineArrowRight />} onClick={() => { setShowTransferForm(true); resetTransferForm() }}>
            Перемещение
          </Button>
        </div>
      </div>

      {/* Модальное окно поступления */}
      <Modal
        isOpen={showIncomeForm}
        onClose={() => { setShowIncomeForm(false); resetIncomeForm() }}
        title="Поступление товаров"
        maxWidth="900px"
      >
        <form onSubmit={handleIncomeSubmit}>
          <div className="form-row">
            <FormField label="Дата" required error={incomeValidation.errors.date}>
              <Input
                type="date"
                value={incomeFormData.date}
                onChange={(e) => {
                  setIncomeFormData({ ...incomeFormData, date: e.target.value })
                  incomeValidation.clearError('date')
                }}
              />
            </FormField>
            <FormField label="Склад" required error={incomeValidation.errors.warehouse_id}>
              <Select
                value={incomeFormData.warehouse_id}
                onChange={(e) => {
                  setIncomeFormData({ ...incomeFormData, warehouse_id: e.target.value })
                  incomeValidation.clearError('warehouse_id')
                }}
                placeholder="Выберите склад..."
                options={warehouses.map(w => ({
                  value: w.id.toString(),
                  label: w.name
                }))}
              />
            </FormField>
            <FormField label="Поставщик" required error={incomeValidation.errors.supplier_id}>
              <Select
                value={incomeFormData.supplier_id}
                onChange={(e) => {
                  setIncomeFormData({ ...incomeFormData, supplier_id: e.target.value })
                  incomeValidation.clearError('supplier_id')
                }}
                placeholder="Выберите поставщика..."
                options={suppliers.map(s => ({
                  value: s.id.toString(),
                  label: s.name
                }))}
              />
            </FormField>
          </div>
          <FormField label="Товары" required>
            <div style={{ marginBottom: '8px' }}>
              <Button type="button" variant="secondary" size="small" icon={<HiOutlinePlus />} onClick={addIncomeItem}>
                Добавить товар
              </Button>
            </div>
            {incomeFormData.items.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px dashed #ccc', borderRadius: '4px' }}>
                Нет товаров. Нажмите "Добавить товар" для начала.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}>Товар</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '100px' }}>Кол-во</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Себест.</th>
                      <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeFormData.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px' }}>
                          <Select
                            value={item.product_id}
                            onChange={(e) => updateIncomeItem(index, 'product_id', e.target.value)}
                            placeholder="Выберите..."
                            options={[
                              { value: '', label: 'Выберите...' },
                              ...products.map(product => ({
                                value: product.id.toString(),
                                label: product.name
                              }))
                            ]}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateIncomeItem(index, 'quantity', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => updateIncomeItem(index, 'cost_price', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => removeIncomeItem(index)}
                            icon={<HiOutlineTrash />}
                            title="Удалить"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormField>
          <FormField label="Описание">
            <textarea
              value={incomeFormData.description}
              onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => { setShowIncomeForm(false); resetIncomeForm() }}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно расхода */}
      <Modal
        isOpen={showOutcomeForm}
        onClose={() => { setShowOutcomeForm(false); resetOutcomeForm() }}
        title="Расход товаров"
        maxWidth="900px"
      >
        <form onSubmit={handleOutcomeSubmit}>
          <div className="form-row">
            <FormField label="Дата" required error={outcomeValidation.errors.date}>
              <Input
                type="date"
                value={outcomeFormData.date}
                onChange={(e) => {
                  setOutcomeFormData({ ...outcomeFormData, date: e.target.value })
                  outcomeValidation.clearError('date')
                }}
              />
            </FormField>
            <FormField label="Склад списания" required error={outcomeValidation.errors.warehouse_id}>
              <Select
                value={outcomeFormData.warehouse_id}
                onChange={(e) => {
                  setOutcomeFormData({ ...outcomeFormData, warehouse_id: e.target.value })
                  outcomeValidation.clearError('warehouse_id')
                }}
                placeholder="Выберите склад..."
                options={warehouses.map(w => ({
                  value: w.id.toString(),
                  label: w.name
                }))}
              />
            </FormField>
          </div>
          <FormField label="Товары" required>
            <div style={{ marginBottom: '8px' }}>
              <Button type="button" variant="secondary" size="small" icon={<HiOutlinePlus />} onClick={addOutcomeItem}>
                Добавить товар
              </Button>
            </div>
            {outcomeFormData.items.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px dashed #ccc', borderRadius: '4px' }}>
                Нет товаров. Нажмите "Добавить товар" для начала.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}>Товар</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '100px' }}>Кол-во</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Себест.</th>
                      <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomeFormData.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px' }}>
                          <Select
                            value={item.product_id}
                            onChange={(e) => updateOutcomeItem(index, 'product_id', e.target.value)}
                            placeholder="Выберите..."
                            options={[
                              { value: '', label: 'Выберите...' },
                              ...products.map(product => ({
                                value: product.id.toString(),
                                label: product.name
                              }))
                            ]}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateOutcomeItem(index, 'quantity', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => updateOutcomeItem(index, 'cost_price', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => removeOutcomeItem(index)}
                            icon={<HiOutlineTrash />}
                            title="Удалить"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormField>
          <FormField label="Описание">
            <textarea
              value={outcomeFormData.description}
              onChange={(e) => setOutcomeFormData({ ...outcomeFormData, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => { setShowOutcomeForm(false); resetOutcomeForm() }}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно перемещения */}
      <Modal
        isOpen={showTransferForm}
        onClose={() => { setShowTransferForm(false); resetTransferForm() }}
        title="Перемещение товаров"
        maxWidth="900px"
      >
        <form onSubmit={handleTransferSubmit}>
          <div className="form-row">
            <FormField label="Дата" required error={transferValidation.errors.date}>
              <Input
                type="date"
                value={transferFormData.date}
                onChange={(e) => {
                  setTransferFormData({ ...transferFormData, date: e.target.value })
                  transferValidation.clearError('date')
                }}
              />
            </FormField>
            <FormField label="Склад-отправитель" required error={transferValidation.errors.from_warehouse_id}>
              <Select
                value={transferFormData.from_warehouse_id}
                onChange={(e) => {
                  setTransferFormData({ ...transferFormData, from_warehouse_id: e.target.value })
                  transferValidation.clearError('from_warehouse_id')
                }}
                placeholder="Выберите склад..."
                options={warehouses.map(w => ({
                  value: w.id.toString(),
                  label: w.name
                }))}
              />
            </FormField>
            <FormField label="Склад-получатель" required error={transferValidation.errors.to_warehouse_id}>
              <Select
                value={transferFormData.to_warehouse_id}
                onChange={(e) => {
                  setTransferFormData({ ...transferFormData, to_warehouse_id: e.target.value })
                  transferValidation.clearError('to_warehouse_id')
                }}
                placeholder="Выберите склад..."
                options={warehouses.map(w => ({
                  value: w.id.toString(),
                  label: w.name
                }))}
              />
            </FormField>
          </div>
          <FormField label="Товары" required>
            <div style={{ marginBottom: '8px' }}>
              <Button type="button" variant="secondary" size="small" icon={<HiOutlinePlus />} onClick={addTransferItem}>
                Добавить товар
              </Button>
            </div>
            {transferFormData.items.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#666', border: '1px dashed #ccc', borderRadius: '4px' }}>
                Нет товаров. Нажмите "Добавить товар" для начала.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginBottom: '8px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'left' }}>Товар</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '100px' }}>Кол-во</th>
                      <th style={{ padding: '8px', fontSize: '12px', textAlign: 'right', width: '120px' }}>Себест.</th>
                      <th style={{ padding: '8px', fontSize: '12px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferFormData.items.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '4px' }}>
                          <Select
                            value={item.product_id}
                            onChange={(e) => updateTransferItem(index, 'product_id', e.target.value)}
                            placeholder="Выберите..."
                            options={[
                              { value: '', label: 'Выберите...' },
                              ...products.map(product => ({
                                value: product.id.toString(),
                                label: product.name
                              }))
                            ]}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateTransferItem(index, 'quantity', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px' }}>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.cost_price}
                            onChange={(e) => updateTransferItem(index, 'cost_price', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td style={{ padding: '4px', textAlign: 'center' }}>
                          <Button
                            type="button"
                            variant="danger"
                            size="small"
                            onClick={() => removeTransferItem(index)}
                            icon={<HiOutlineTrash />}
                            title="Удалить"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormField>
          <FormField label="Описание">
            <textarea
              value={transferFormData.description}
              onChange={(e) => setTransferFormData({ ...transferFormData, description: e.target.value })}
              rows={2}
            />
          </FormField>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={() => { setShowTransferForm(false); resetTransferForm() }}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Текущие остатки</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="small" icon={<HiOutlinePlus />} onClick={() => { setShowIncomeForm(true); resetIncomeForm() }}>
              Поступление
            </Button>
            <Button variant="secondary" size="small" icon={<HiOutlinePlus />} onClick={() => { setShowOutcomeForm(true); resetOutcomeForm() }}>
              Расход
            </Button>
            <Button variant="secondary" size="small" icon={<HiOutlineArrowRight />} onClick={() => { setShowTransferForm(true); resetTransferForm() }}>
              Перемещение
            </Button>
          </div>
        </div>
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
    </div>
  )
}

export default Inventory

