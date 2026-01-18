import { useEffect, useState } from 'react'
import { recommendationsService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import './RecommendationsWidget.css'

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
}

const RecommendationsWidget = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { selectedCompanyId } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadRecommendations()
  }, [selectedCompanyId])

  const loadRecommendations = async () => {
    try {
      const [recs, statsData] = await Promise.all([
        recommendationsService.getRecommendations({
          company_id: selectedCompanyId || undefined,
          is_dismissed: false,
          limit: 5,
        }),
        recommendationsService.getStats({
          company_id: selectedCompanyId || undefined,
        }),
      ])
      setRecommendations(recs)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await recommendationsService.dismissRecommendation(id)
      loadRecommendations()
    } catch (error) {
      console.error('Error dismissing recommendation:', error)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await recommendationsService.markAsRead(id)
      loadRecommendations()
    } catch (error) {
      console.error('Error marking as read:', error)
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

  if (loading) {
    return (
      <div className="recommendations-widget">
        <div className="recommendations-widget-header">
          <h3>Рекомендации</h3>
        </div>
        <LoadingSpinner />
      </div>
    )
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="recommendations-widget">
        <div className="recommendations-widget-header">
          <h3>Рекомендации</h3>
        </div>
        <div className="recommendations-widget-empty">
          Нет рекомендаций
        </div>
      </div>
    )
  }

  return (
    <div className="recommendations-widget">
      <div className="recommendations-widget-header">
        <h3>Рекомендации</h3>
        {stats.unread > 0 && (
          <span className="recommendations-widget-badge">{stats.unread}</span>
        )}
        <button
          className="recommendations-widget-view-all"
          onClick={() => navigate('/recommendations')}
        >
          Все →
        </button>
      </div>
      <div className="recommendations-widget-stats">
        <span className={`recommendations-stat critical`}>
          🔴 {stats.critical}
        </span>
        <span className={`recommendations-stat important`}>
          🟡 {stats.important}
        </span>
        <span className={`recommendations-stat info`}>
          🔵 {stats.info}
        </span>
      </div>
      <div className="recommendations-widget-list">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`recommendation-item ${getPriorityColor(rec.priority)} ${
              !rec.is_read ? 'unread' : ''
            }`}
          >
            <div className="recommendation-item-header">
              <span className="recommendation-priority-icon">
                {getPriorityIcon(rec.priority)}
              </span>
              <span className="recommendation-title">{rec.title}</span>
              <div className="recommendation-item-actions">
                {!rec.is_read && (
                  <button
                    className="recommendation-action-btn"
                    onClick={() => handleMarkAsRead(rec.id)}
                    title="Отметить как прочитанное"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="recommendation-action-btn"
                  onClick={() => handleDismiss(rec.id)}
                  title="Отклонить"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="recommendation-description">{rec.description}</div>
            {rec.action && (
              <div className="recommendation-action">{rec.action}</div>
            )}
          </div>
        ))}
      </div>
      {stats.total > recommendations.length && (
        <div className="recommendations-widget-footer">
          <button
            className="recommendations-widget-view-all-btn"
            onClick={() => navigate('/recommendations')}
          >
            Показать все {stats.total} рекомендаций →
          </button>
        </div>
      )}
    </div>
  )
}

export default RecommendationsWidget
