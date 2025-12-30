import { useState, useEffect } from 'react'
import { dashboardWidgetsService, dashboardService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { format, subMonths } from 'date-fns'
import DashboardWidget from '../components/DashboardWidget'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import './DashboardCustom.css'

interface Widget {
  id: number
  widget_type: string
  title?: string
  widget_config: any
  order: number
}

const DashboardCustom = () => {
  const { selectedCompanyId, user } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showWidgetForm, setShowWidgetForm] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [widgetFormData, setWidgetFormData] = useState({
    widget_type: 'metric',
    title: '',
    config: {} as any
  })
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    loadWidgets()
    loadDashboardData()
  }, [selectedCompanyId])

  const loadWidgets = async () => {
    try {
      setLoading(true)
      const data = await dashboardWidgetsService.getWidgets({
        company_id: selectedCompanyId
      })
      setWidgets(data.sort((a: Widget, b: Widget) => a.order - b.order))
    } catch (error) {
      console.error('Error loading widgets:', error)
      showError('Ошибка загрузки виджетов')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const endDate = new Date()
      const startDate = subMonths(endDate, 3)
      const data = await dashboardService.getDashboard({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        company_id: selectedCompanyId || undefined,
      })
      setDashboardData(data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleAddWidget = () => {
    setEditingWidget(null)
    setWidgetFormData({
      widget_type: 'metric',
      title: '',
      config: {}
    })
    setShowWidgetForm(true)
  }

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget)
    setWidgetFormData({
      widget_type: widget.widget_type,
      title: widget.title || '',
      config: widget.widget_config || {}
    })
    setShowWidgetForm(true)
  }

  const handleDeleteWidget = async (widgetId: number) => {
    const confirmed = await confirm(
      'Удалить виджет?',
      'Вы уверены, что хотите удалить этот виджет?'
    )
    if (!confirmed) return

    try {
      await dashboardWidgetsService.deleteWidget(widgetId)
      showSuccess('Виджет удален')
      loadWidgets()
    } catch (error) {
      showError('Ошибка удаления виджета')
    }
  }

  const handleSaveWidget = async () => {
    try {
      const widgetData = {
        user_id: user?.id,
        company_id: selectedCompanyId || null,
        widget_type: widgetFormData.widget_type,
        widget_config: widgetFormData.config,
        title: widgetFormData.title || null,
        order: editingWidget ? editingWidget.order : widgets.length
      }

      if (editingWidget) {
        await dashboardWidgetsService.updateWidget(editingWidget.id, widgetData)
        showSuccess('Виджет обновлен')
      } else {
        await dashboardWidgetsService.createWidget(widgetData)
        showSuccess('Виджет добавлен')
      }

      setShowWidgetForm(false)
      loadWidgets()
    } catch (error) {
      showError('Ошибка сохранения виджета')
    }
  }

  const handleMoveWidget = async (widgetId: number, direction: 'up' | 'down') => {
    const widgetIndex = widgets.findIndex(w => w.id === widgetId)
    if (widgetIndex === -1) return

    const newIndex = direction === 'up' ? widgetIndex - 1 : widgetIndex + 1
    if (newIndex < 0 || newIndex >= widgets.length) return

    const newWidgets = [...widgets]
    const [movedWidget] = newWidgets.splice(widgetIndex, 1)
    newWidgets.splice(newIndex, 0, movedWidget)

    // Обновляем порядок
    const orders = newWidgets.map((w, idx) => ({ id: w.id, order: idx }))
    try {
      await dashboardWidgetsService.reorderWidgets(orders)
      setWidgets(newWidgets)
      showSuccess('Порядок виджетов обновлен')
    } catch (error) {
      showError('Ошибка изменения порядка')
    }
  }

  const getWidgetData = (widget: Widget) => {
    if (!dashboardData) return null

    switch (widget.widget_type) {
      case 'metric':
        const metricType = widget.widget_config.metric_type || 'revenue'
        return {
          value: dashboardData.current_indicators?.[metricType] || 0,
          change: widget.widget_config.show_change ? 5 : undefined // Заглушка для изменения
        }
      
      case 'chart':
        const chartType = widget.widget_config.chart_type || 'cash_balance'
        return {
          chartData: dashboardData[`${chartType}_dynamics`] || []
        }
      
      case 'table':
        return {
          columns: widget.widget_config.columns || [],
          rows: widget.widget_config.rows || []
        }
      
      default:
        return null
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="dashboard-custom">
      <div className="dashboard-header">
        <h1>Настраиваемый дашборд</h1>
        <div className="dashboard-actions">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            {isEditMode ? '✓ Завершить редактирование' : '✎ Редактировать'}
          </button>
          {isEditMode && (
            <button onClick={handleAddWidget} className="btn btn-primary">
              + Добавить виджет
            </button>
          )}
        </div>
      </div>

      {widgets.length === 0 && !isEditMode ? (
        <EmptyState
          icon="📊"
          title="Нет виджетов"
          message="Нажмите 'Редактировать' чтобы добавить виджеты на дашборд"
        />
      ) : (
        <div className="dashboard-widgets-grid">
          {widgets.map((widget) => (
            <DashboardWidget
              key={widget.id}
              id={widget.id}
              type={widget.widget_type}
              title={widget.title}
              config={widget.widget_config}
              data={getWidgetData(widget)}
              isEditable={isEditMode}
              onEdit={() => handleEditWidget(widget)}
              onDelete={() => handleDeleteWidget(widget.id)}
              onMove={(direction) => handleMoveWidget(widget.id, direction)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showWidgetForm}
        onClose={() => setShowWidgetForm(false)}
        title={editingWidget ? 'Редактировать виджет' : 'Добавить виджет'}
        maxWidth="600px"
      >
        <div className="widget-form">
          <FormField
            label="Тип виджета"
            value={widgetFormData.widget_type}
            onChange={(e) => setWidgetFormData({
              ...widgetFormData,
              widget_type: e.target.value,
              config: {}
            })}
            type="select"
            options={[
              { value: 'metric', label: 'Метрика' },
              { value: 'chart', label: 'График' },
              { value: 'table', label: 'Таблица' }
            ]}
          />

          <FormField
            label="Название"
            value={widgetFormData.title}
            onChange={(e) => setWidgetFormData({
              ...widgetFormData,
              title: e.target.value
            })}
          />

          {widgetFormData.widget_type === 'metric' && (
            <FormField
              label="Тип метрики"
              value={widgetFormData.config.metric_type || 'revenue'}
              onChange={(e) => setWidgetFormData({
                ...widgetFormData,
                config: {
                  ...widgetFormData.config,
                  metric_type: e.target.value
                }
              })}
              type="select"
              options={[
                { value: 'revenue', label: 'Выручка' },
                { value: 'gross_profit', label: 'Валовая прибыль' },
                { value: 'net_profit', label: 'Чистая прибыль' },
                { value: 'expenses', label: 'Расходы' },
                { value: 'gross_margin', label: 'Рентабельность валовой прибыли' },
                { value: 'net_margin', label: 'Рентабельность чистой прибыли' }
              ]}
            />
          )}

          {widgetFormData.widget_type === 'chart' && (
            <FormField
              label="Тип графика"
              value={widgetFormData.config.chart_type || 'cash_balance'}
              onChange={(e) => setWidgetFormData({
                ...widgetFormData,
                config: {
                  ...widgetFormData.config,
                  chart_type: e.target.value
                }
              })}
              type="select"
              options={[
                { value: 'cash_balance', label: 'Остатки на счетах' },
                { value: 'net_profit', label: 'Чистая прибыль' },
                { value: 'gross_profit', label: 'Валовая прибыль' }
              ]}
            />
          )}

          <div className="form-actions">
            <button onClick={() => setShowWidgetForm(false)} className="btn btn-secondary">
              Отмена
            </button>
            <button onClick={handleSaveWidget} className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DashboardCustom

