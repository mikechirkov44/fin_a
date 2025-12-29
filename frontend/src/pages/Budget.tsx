import { useState, useEffect } from 'react'
import { budgetService, referenceService } from '../services/api'
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
import { ru } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const Budget = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [budgets, setBudgets] = useState<any[]>([])
  const [comparison, setComparison] = useState<any[]>([])
  const [incomeItems, setIncomeItems] = useState<any[]>([])
  const [expenseItems, setExpenseItems] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'budgets' | 'comparison'>('budgets')
  const [loading, setLoading] = useState(true)
  
  const validation = useFormValidation({
    company_id: { required: true },
    period_type: { required: true },
    period_value: { required: true },
    budget_type: { required: true },
    planned_amount: { required: true, min: 0 },
    income_item_id: {
      custom: (value) => {
        if (formData.budget_type === 'income' && !value) {
          return 'Выберите статью дохода'
        }
        return null
      }
    },
    expense_item_id: {
      custom: (value) => {
        if (formData.budget_type === 'expense' && !value) {
          return 'Выберите статью расхода'
        }
        return null
      }
    },
  })
  const [filters, setFilters] = useState({
    period_type: 'month',
    period_value: format(new Date(), 'yyyy-MM'),
    budget_type: '',
  })
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId || '',
    period_type: 'month',
    period_value: format(new Date(), 'yyyy-MM'),
    budget_type: 'income',
    income_item_id: '',
    expense_item_id: '',
    planned_amount: '',
    description: '',
  })

  useEffect(() => {
    loadReferences()
    loadData()
  }, [])

  useEffect(() => {
    if (selectedCompanyId && !formData.company_id) {
      setFormData(prev => ({ ...prev, company_id: selectedCompanyId }))
    }
  }, [selectedCompanyId])

  useEffect(() => {
    loadData()
    if (activeTab === 'comparison') {
      loadComparison()
    }
  }, [filters, activeTab])

  const loadReferences = async () => {
    try {
      const [income, expense] = await Promise.all([
        referenceService.getIncomeItems(),
        referenceService.getExpenseItems(),
      ])
      setIncomeItems(income)
      setExpenseItems(expense)
    } catch (error) {
      console.error('Error loading references:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCompanyId) params.company_id = selectedCompanyId
      if (filters.period_type) params.period_type = filters.period_type
      if (filters.period_value) params.period_value = filters.period_value
      if (filters.budget_type) params.budget_type = filters.budget_type
      
      const data = await budgetService.getBudgets(params)
      setBudgets(data)
    } catch (error) {
      console.error('Error loading budgets:', error)
      showError('Ошибка загрузки бюджетов')
    } finally {
      setLoading(false)
    }
  }

  const loadComparison = async () => {
    try {
      const params: any = {}
      if (selectedCompanyId) params.company_id = selectedCompanyId
      if (filters.period_type) params.period_type = filters.period_type
      if (filters.period_value) params.period_value = filters.period_value
      
      const data = await budgetService.getComparison(params)
      setComparison(data)
    } catch (error) {
      console.error('Error loading comparison:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validation.validate(formData)) {
      showError('Исправьте ошибки в форме')
      return
    }
    
    try {
      const submitData = {
        ...formData,
        company_id: parseInt(formData.company_id),
        planned_amount: parseFloat(formData.planned_amount),
        income_item_id: formData.budget_type === 'income' ? parseInt(formData.income_item_id) : null,
        expense_item_id: formData.budget_type === 'expense' ? parseInt(formData.expense_item_id) : null,
      }
      
      if (editingBudget) {
        await budgetService.updateBudget(editingBudget.id, submitData)
      } else {
        await budgetService.createBudget(submitData)
      }
      
      handleClose()
      showSuccess(editingBudget ? 'Бюджет успешно обновлен' : 'Бюджет успешно создан')
      loadData()
      if (activeTab === 'comparison') {
        loadComparison()
      }
    } catch (error: any) {
      showError(`Ошибка сохранения: ${error.response?.data?.detail || error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      company_id: selectedCompanyId || '',
      period_type: 'month',
      period_value: format(new Date(), 'yyyy-MM'),
      budget_type: 'income',
      income_item_id: '',
      expense_item_id: '',
      planned_amount: '',
      description: '',
    })
    validation.clearAllErrors()
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingBudget(null)
    resetForm()
  }

  const handleEdit = (budget: any) => {
    setEditingBudget(budget)
    setFormData({
      company_id: budget.company_id.toString(),
      period_type: budget.period_type,
      period_value: budget.period_value,
      budget_type: budget.budget_type,
      income_item_id: budget.income_item_id?.toString() || '',
      expense_item_id: budget.expense_item_id?.toString() || '',
      planned_amount: budget.planned_amount.toString(),
      description: budget.description || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление бюджета',
      message: 'Вы уверены, что хотите удалить этот бюджет?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await budgetService.deleteBudget(id)
      showSuccess('Бюджет успешно удален')
      loadData()
      if (activeTab === 'comparison') {
        loadComparison()
      }
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления бюджета')
    }
  }

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      action: () => {
        if (!showForm) {
          setShowForm(true)
          setEditingBudget(null)
          resetForm()
        }
      },
      description: 'Создать новый бюджет',
    },
    {
      key: 'Escape',
      action: () => {
        if (showForm) {
          handleClose()
        }
      },
      description: 'Закрыть форму',
    },
  ])

  const getPeriodLabel = (periodType: string, periodValue: string) => {
    if (periodType === 'month') {
      const [year, month] = periodValue.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      return format(date, 'MMMM yyyy', { locale: ru })
    } else if (periodType === 'quarter') {
      return periodValue
    } else {
      return periodValue
    }
  }

  // Подготовка данных для графика
  const chartData = comparison.map(item => ({
    name: item.item_name || 'Без названия',
    План: item.planned_amount,
    Факт: item.actual_amount,
    Отклонение: item.deviation,
  }))

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Бюджетирование</h2>
        <Tooltip content="Создать новый бюджет (Ctrl+N)">
          <button onClick={() => { setShowForm(true); setEditingBudget(null); resetForm() }} className="primary">
            Добавить бюджет
          </button>
        </Tooltip>
      </div>

      {/* Вкладки */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('budgets')}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderBottom: activeTab === 'budgets' ? '2px solid var(--primary-color)' : '2px solid transparent',
            marginBottom: '-2px',
            fontWeight: activeTab === 'budgets' ? 'bold' : 'normal',
          }}
        >
          Бюджеты
        </button>
        <button
          onClick={() => { setActiveTab('comparison'); loadComparison() }}
          style={{
            padding: '8px 16px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderBottom: activeTab === 'comparison' ? '2px solid var(--primary-color)' : '2px solid transparent',
            marginBottom: '-2px',
            fontWeight: activeTab === 'comparison' ? 'bold' : 'normal',
          }}
        >
          План/Факт
        </button>
      </div>

      {/* Фильтры */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Фильтры</div>
        <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="form-group">
            <label>Тип периода</label>
            <select
              value={filters.period_type}
              onChange={(e) => setFilters({ ...filters, period_type: e.target.value })}
            >
              <option value="month">Месяц</option>
              <option value="quarter">Квартал</option>
              <option value="year">Год</option>
            </select>
          </div>
          <div className="form-group">
            <label>Период</label>
            {filters.period_type === 'month' ? (
              <input
                type="month"
                value={filters.period_value}
                onChange={(e) => setFilters({ ...filters, period_value: e.target.value })}
              />
            ) : filters.period_type === 'quarter' ? (
              <input
                type="text"
                placeholder="2024-Q1"
                value={filters.period_value}
                onChange={(e) => setFilters({ ...filters, period_value: e.target.value })}
              />
            ) : (
              <input
                type="number"
                placeholder="2024"
                value={filters.period_value}
                onChange={(e) => setFilters({ ...filters, period_value: e.target.value })}
              />
            )}
          </div>
          <div className="form-group">
            <label>Тип бюджета</label>
            <select
              value={filters.budget_type}
              onChange={(e) => setFilters({ ...filters, budget_type: e.target.value })}
            >
              <option value="">Все</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
            </select>
          </div>
        </div>
      </div>

      {/* Форма создания/редактирования */}
      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingBudget ? 'Редактировать бюджет' : 'Добавить бюджет'}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit}>
            <div className="form-row">
              <FormField label="Организация" required error={validation.errors.company_id}>
                <select
                  value={formData.company_id}
                  onChange={(e) => {
                    setFormData({ ...formData, company_id: e.target.value })
                    validation.clearError('company_id')
                  }}
                  disabled={!!editingBudget}
                >
                  <option value="">Выберите...</option>
                  {companies.filter(c => c.is_active).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Тип периода" required error={validation.errors.period_type}>
                <select
                  value={formData.period_type}
                  onChange={(e) => {
                    setFormData({ ...formData, period_type: e.target.value })
                    validation.clearError('period_type')
                  }}
                  disabled={!!editingBudget}
                >
                  <option value="month">Месяц</option>
                  <option value="quarter">Квартал</option>
                  <option value="year">Год</option>
                </select>
              </FormField>
              <FormField label="Период" required error={validation.errors.period_value}>
                {formData.period_type === 'month' ? (
                  <input
                    type="month"
                    value={formData.period_value}
                    onChange={(e) => {
                      setFormData({ ...formData, period_value: e.target.value })
                      validation.clearError('period_value')
                    }}
                    disabled={!!editingBudget}
                  />
                ) : formData.period_type === 'quarter' ? (
                  <input
                    type="text"
                    placeholder="2024-Q1"
                    value={formData.period_value}
                    onChange={(e) => {
                      setFormData({ ...formData, period_value: e.target.value })
                      validation.clearError('period_value')
                    }}
                    disabled={!!editingBudget}
                  />
                ) : (
                  <input
                    type="number"
                    placeholder="2024"
                    value={formData.period_value}
                    onChange={(e) => {
                      setFormData({ ...formData, period_value: e.target.value })
                      validation.clearError('period_value')
                    }}
                    disabled={!!editingBudget}
                  />
                )}
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Тип бюджета" required error={validation.errors.budget_type}>
                <select
                  value={formData.budget_type}
                  onChange={(e) => {
                    setFormData({ ...formData, budget_type: e.target.value, income_item_id: '', expense_item_id: '' })
                    validation.clearError('budget_type')
                    validation.clearError('income_item_id')
                    validation.clearError('expense_item_id')
                  }}
                  disabled={!!editingBudget}
                >
                  <option value="income">Доходы</option>
                  <option value="expense">Расходы</option>
                </select>
              </FormField>
              <FormField 
                label={formData.budget_type === 'income' ? 'Статья дохода' : 'Статья расхода'} 
                required 
                error={formData.budget_type === 'income' ? validation.errors.income_item_id : validation.errors.expense_item_id}
              >
                <select
                  value={formData.budget_type === 'income' ? formData.income_item_id : formData.expense_item_id}
                  onChange={(e) => {
                    if (formData.budget_type === 'income') {
                      setFormData({ ...formData, income_item_id: e.target.value })
                      validation.clearError('income_item_id')
                    } else {
                      setFormData({ ...formData, expense_item_id: e.target.value })
                      validation.clearError('expense_item_id')
                    }
                  }}
                  disabled={!!editingBudget}
                >
                  <option value="">Выберите...</option>
                  {(formData.budget_type === 'income' ? incomeItems : expenseItems).map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Плановая сумма" required error={validation.errors.planned_amount}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.planned_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, planned_amount: e.target.value })
                    validation.clearError('planned_amount')
                  }}
                />
              </FormField>
            </div>
            <FormField label="Описание">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </FormField>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleClose}>
                Отмена
              </button>
              <button type="submit" className="primary">
                Сохранить
              </button>
            </div>
          </form>
      </Modal>

      {/* Таблица бюджетов */}
      {activeTab === 'budgets' && (
        <div className="card">
          <div className="card-header">Список бюджетов</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Период</th>
                  <th>Тип</th>
                  <th>Статья</th>
                  <th>Плановая сумма</th>
                  <th>Организация</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <LoadingSpinner message="Загрузка бюджетов..." />
                    </td>
                  </tr>
                ) : budgets.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon="💰"
                        title="Нет бюджетов"
                        message="Добавьте первый бюджет, чтобы начать работу"
                        action={{
                          label: 'Добавить бюджет',
                          onClick: () => { setShowForm(true); setEditingBudget(null); resetForm() }
                        }}
                      />
                    </td>
                  </tr>
                ) : (
                  budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>{getPeriodLabel(budget.period_type, budget.period_value)}</td>
                      <td>{budget.budget_type === 'income' ? 'Доходы' : 'Расходы'}</td>
                      <td>{budget.item_name || '-'}</td>
                      <td className="text-right">{budget.planned_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      <td>{budget.company_name || '-'}</td>
                      <td>
                        <Tooltip content="Редактировать бюджет">
                          <button onClick={() => handleEdit(budget)} style={{ marginRight: '8px' }}>✏️ Изменить</button>
                        </Tooltip>
                        <Tooltip content="Удалить бюджет">
                          <button onClick={() => handleDelete(budget.id)} className="danger">🗑️ Удалить</button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Сравнение план/факт */}
      {activeTab === 'comparison' && (
        <>
          {comparison.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">График план/факт</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: number) => value.toLocaleString('ru-RU') + ' ₽'} />
                  <Legend />
                  <Bar dataKey="План" fill="#4a90e2" />
                  <Bar dataKey="Факт" fill="#27ae60" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="card">
            <div className="card-header">Сравнение план/факт</div>
            <table>
              <thead>
                <tr>
                  <th>Статья</th>
                  <th>План</th>
                  <th>Факт</th>
                  <th>Отклонение</th>
                  <th>Отклонение %</th>
                </tr>
              </thead>
              <tbody>
                {comparison.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">Нет данных для сравнения</td>
                  </tr>
                ) : (
                  comparison.map((item) => (
                    <tr key={item.budget_id}>
                      <td>{item.item_name || '-'}</td>
                      <td className="text-right">{item.planned_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      <td className="text-right">{item.actual_amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽</td>
                      <td className={`text-right ${item.deviation >= 0 ? 'text-success' : 'text-danger'}`}>
                        {item.deviation >= 0 ? '+' : ''}{item.deviation.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
                      </td>
                      <td className={`text-right ${item.deviation_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                        {item.deviation_percent >= 0 ? '+' : ''}{item.deviation_percent.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Budget

