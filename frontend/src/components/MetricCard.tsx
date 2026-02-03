import './MetricCard.css'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  subtitle?: string
}

const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'primary',
  subtitle 
}: MetricCardProps) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return Math.round(val).toLocaleString('ru-RU')
    }
    return val
  }

  return (
    <div className={`metric-card metric-card-${color}`}>
      <div className="metric-card-header">
        <div className="metric-card-title">{title}</div>
        {icon && <div className="metric-card-icon">{icon}</div>}
      </div>
      <div className="metric-card-value">{formatValue(value)}</div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`metric-card-trend ${trend.isPositive !== false ? 'trend-positive' : 'trend-negative'}`}>
          <span className="trend-arrow">{trend.isPositive !== false ? '↑' : '↓'}</span>
          <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          <span className="trend-label">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

export default MetricCard

