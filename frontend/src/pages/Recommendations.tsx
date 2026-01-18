import { useState, useEffect } from 'react'
import { recommendationsService } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import SkeletonLoader from '../components/SkeletonLoader'
import FormField from '../components/FormField'
import Pagination from '../components/Pagination'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import './Recommendations.css'

interface Recommendation {
  id: number
  type: string
  category: string
  priority: 'critical' | 'important' | 'info'
  title: string
  description: string
  action?: string
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  meta_data?: any
}

const Recommendations = () => {
  const { showSuccess, showError } = useToast()
  const { selectedCompanyId } = useAuth()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    priority: '',
    is_dismissed: false,
    is_read: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    loadRecommendations()
    loadStats()
  }, [selectedCompanyId, filters, currentPage])

  const loadRecommendations = async () => {
    try {
      setLoading(true)
      const params: any = {
        company_id: selectedCompanyId || undefined,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
      }
      
      if (filters.type) params.type = filters.type
      if (filters.category) params.category = filters.category
      if (filters.priority) params.priority = filters.priority
      if (filters.is_read !== '') params.is_read = filters.is_read === 'true'
      params.is_dismissed = filters.is_dismissed

      const data = await recommendationsService.getRecommendations(params)
      setRecommendations(data)
    } catch (error: any) {
      console.error('Error loading recommendations:', error)
      showError(error?.response?.data?.detail || 'Ошибка загрузки рекомендаций')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await recommendationsService.getStats({
        company_id: selectedCompanyId || undefined,
      })
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await recommendationsService.dismissRecommendation(id)
      showSuccess('Рекомендация отклонена')
      loadRecommendations()
      loadStats()
    } catch (error: any) {
      console.error('Error dismissing recommendation:', error)
      showError(error?.response?.data?.detail || 'Ошибка отклонения рекомендации')
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await recommendationsService.markAsRead(id)
      loadRecommendations()
      loadStats()
    } catch (error: any) {
      console.error('Error marking as read:', error)
      showError(error?.response?.data?.detail || 'Ошибка отметки рекомендации')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'critical'
      case 'important':
        return 'important'
      case 'info':
        return 'info'
      default:
        return 'info'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '🔴'
      case 'important':
        return '🟡'
      case 'info':
        return '🔵'
      default:
        return 'ℹ️'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'financial':
        return 'Финансовая'
      case 'operational':
        return 'Операционная'
      case 'analytical':
        return 'Аналитическая'
      default:
        return type
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      margin: 'Маржинальность',
      expenses: 'Расходы',
      cash_flow: 'Денежные средства',
      turnover: 'Оборачиваемость',
      product: 'Товары',
      sales: 'Продажи',
      budget: 'Бюджет',
      trend: 'Тренды',
      anomaly: 'Аномалии',
    }
    return labels[category] || category
  }

  const filteredRecommendations = recommendations.filter((rec) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      rec.title.toLowerCase().includes(query) ||
      rec.description.toLowerCase().includes(query) ||
      (rec.action && rec.action.toLowerCase().includes(query))
    )
  })

  const totalPages = stats ? Math.ceil(stats.total / itemsPerPage) : 1

  return (
    <div className="recommendations-page">
      <div className="recommendations-header">
        <h1>Рекомендации</h1>
      </div>

      {stats && (
        <div className="recommendations-stats-grid">
          <div className="stat-card">
            <div className="stat-label">Всего</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-label">Критично</div>
            <div className="stat-value">{stats.critical}</div>
          </div>
          <div className="stat-card important">
            <div className="stat-label">Важно</div>
            <div className="stat-value">{stats.important}</div>
          </div>
          <div className="stat-card info">
            <div className="stat-label">Информационно</div>
            <div className="stat-value">{stats.info}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Непрочитано</div>
            <div className="stat-value">{stats.unread}</div>
          </div>
        </div>
      )}

      <div className="recommendations-filters">
        <FormField
          label="Поиск"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по заголовку, описанию..."
        />
        <FormField
          label="Тип"
          type="select"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Все типы</option>
          <option value="financial">Финансовая</option>
          <option value="operational">Операционная</option>
          <option value="analytical">Аналитическая</option>
        </FormField>
        <FormField
          label="Приоритет"
          type="select"
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option value="">Все приоритеты</option>
          <option value="critical">Критично</option>
          <option value="important">Важно</option>
          <option value="info">Информационно</option>
        </FormField>
        <FormField
          label="Статус прочтения"
          type="select"
          value={filters.is_read}
          onChange={(e) => setFilters({ ...filters, is_read: e.target.value })}
        >
          <option value="">Все</option>
          <option value="false">Непрочитано</option>
          <option value="true">Прочитано</option>
        </FormField>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.is_dismissed}
            onChange={(e) => setFilters({ ...filters, is_dismissed: e.target.checked })}
          />
          Показать отклоненные
        </label>
      </div>

      {loading ? (
        <div className="recommendations-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} type="card" />
          ))}
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <EmptyState
          icon="💡"
          title="Нет рекомендаций"
          message="Рекомендации не найдены. Рекомендации генерируются автоматически на основе данных вашей организации."
        />
      ) : (
        <>
          <div className="recommendations-list">
            {filteredRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={`recommendation-card ${getPriorityColor(rec.priority)} ${
                  !rec.is_read ? 'unread' : ''
                }`}
              >
                <div className="recommendation-card-header">
                  <div className="recommendation-card-title-row">
                    <span className="recommendation-priority-icon">
                      {getPriorityIcon(rec.priority)}
                    </span>
                    <h3 className="recommendation-title">{rec.title}</h3>
                    <span className="recommendation-badges">
                      <span className="recommendation-badge type">
                        {getTypeLabel(rec.type)}
                      </span>
                      <span className="recommendation-badge category">
                        {getCategoryLabel(rec.category)}
                      </span>
                    </span>
                  </div>
                  <div className="recommendation-card-actions">
                    {!rec.is_read && (
                      <button
                        className="btn-icon"
                        onClick={() => handleMarkAsRead(rec.id)}
                        title="Отметить как прочитанное"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      onClick={() => handleDismiss(rec.id)}
                      title="Отклонить"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="recommendation-description">{rec.description}</div>
                {rec.action && (
                  <div className="recommendation-action">
                    <strong>Рекомендация:</strong> {rec.action}
                  </div>
                )}
                <div className="recommendation-footer">
                  <span className="recommendation-date">
                    {format(new Date(rec.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  )
}

export default Recommendations
