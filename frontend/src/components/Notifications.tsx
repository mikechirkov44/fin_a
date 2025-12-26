import { useState, useEffect } from 'react'
import { notificationService } from '../services/api'
import { format } from 'date-fns'

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUnreadCount()
    loadNotifications()
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(() => {
      loadUnreadCount()
      loadNotifications()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications({ limit: 10, is_read: false })
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount()
      setUnreadCount(data.count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id)
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await notificationService.deleteNotification(id)
      await loadNotifications()
      await loadUnreadCount()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'alert': '⚠️',
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
    }
    return icons[type] || '📢'
  }

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'alert': '#ffc107',
      'info': '#17a2b8',
      'warning': '#ff9800',
      'error': '#dc3545',
    }
    return colors[type] || '#666'
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          padding: '8px 12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '20px',
        }}
        title="Уведомления"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setShowDropdown(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              width: '400px',
              maxHeight: '500px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <strong>Уведомления</strong>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--primary-color)',
                  }}
                >
                  Отметить все как прочитанные
                </button>
              )}
            </div>
            <div
              style={{
                overflowY: 'auto',
                maxHeight: '400px',
              }}
            >
              {loading ? (
                <div style={{ padding: '16px', textAlign: 'center' }}>Загрузка...</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Нет уведомлений
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: notification.is_read ? 'transparent' : 'var(--hover-bg)',
                      cursor: 'pointer',
                    }}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '20px' }}>{getTypeIcon(notification.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: notification.is_read ? 'normal' : 'bold',
                            marginBottom: '4px',
                            color: getTypeColor(notification.type),
                          }}
                        >
                          {notification.title}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px',
                          }}
                        >
                          {notification.message}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{format(new Date(notification.created_at), 'dd.MM.yyyy HH:mm')}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            style={{
                              padding: '2px 6px',
                              fontSize: '11px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                            }}
                            title="Удалить"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Notifications

