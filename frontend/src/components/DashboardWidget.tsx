import { useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './DashboardWidget.css'

interface DashboardWidgetProps {
  id: number
  type: string
  title?: string
  config: any
  data?: any
  onEdit?: () => void
  onDelete?: () => void
  onMove?: (direction: 'up' | 'down') => void
  isEditable?: boolean
}

const DashboardWidget = ({
  id,
  type,
  title,
  config,
  data,
  onEdit,
  onDelete,
  onMove,
  isEditable = false
}: DashboardWidgetProps) => {
  const { showError } = useToast()
  const [isDragging, setIsDragging] = useState(false)

  const renderWidgetContent = () => {
    switch (type) {
      case 'metric':
        return (
          <div className="widget-metric">
            <div className="widget-metric-value">
              {data?.value ? `${parseFloat(data.value).toLocaleString('ru-RU')} ₽` : '-'}
            </div>
            {data?.change !== undefined && (
              <div className={`widget-metric-change ${data.change >= 0 ? 'positive' : 'negative'}`}>
                {data.change >= 0 ? '↑' : '↓'} {Math.abs(data.change)}%
              </div>
            )}
          </div>
        )
      
      case 'chart':
        return (
          <div className="widget-chart">
            {data?.chartData ? (
              <div style={{ height: config.height || '200px' }}>
                {/* График будет рендериться через переданный компонент */}
                {config.chartComponent}
              </div>
            ) : (
              <div className="widget-empty">Нет данных для графика</div>
            )}
          </div>
        )
      
      case 'table':
        return (
          <div className="widget-table">
            {data?.rows ? (
              <table>
                <thead>
                  <tr>
                    {data.columns?.map((col: string, idx: number) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row: any[], idx: number) => (
                    <tr key={idx}>
                      {row.map((cell: any, cellIdx: number) => (
                        <td key={cellIdx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="widget-empty">Нет данных для таблицы</div>
            )}
          </div>
        )
      
      default:
        return <div className="widget-empty">Неизвестный тип виджета</div>
    }
  }

  return (
    <div className={`dashboard-widget ${isDragging ? 'dragging' : ''}`} style={config.style}>
      <div className="widget-header">
        {title && <h3 className="widget-title">{title}</h3>}
        {isEditable && (
          <div className="widget-actions">
            {onMove && (
              <>
                <button
                  onClick={() => onMove('up')}
                  className="widget-action-btn"
                  title="Переместить вверх"
                >
                  ↑
                </button>
                <button
                  onClick={() => onMove('down')}
                  className="widget-action-btn"
                  title="Переместить вниз"
                >
                  ↓
                </button>
              </>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                className="widget-action-btn"
                title="Редактировать"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="widget-action-btn widget-action-delete"
                title="Удалить"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
      <div className="widget-content">
        {renderWidgetContent()}
      </div>
    </div>
  )
}

export default DashboardWidget

