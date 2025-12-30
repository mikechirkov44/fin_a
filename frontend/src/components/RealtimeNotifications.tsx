import React, { useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

const RealtimeNotifications = () => {
  const { showSuccess, showError, showInfo } = useToast()
  const { token } = useAuth()
  const [wsEnabled, setWsEnabled] = React.useState(true)

  // Используем прямой URL к бэкенду для WebSocket
  // Прокси Vite может некорректно обрабатывать WebSocket соединения
  const wsUrl = React.useMemo(() => {
    // В development используем прямой URL к бэкенду
    const backendUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8000'
    return `${backendUrl}/ws/notifications`
  }, [])

  const { isConnected, sendMessage } = useWebSocket({
    url: wsEnabled ? wsUrl : '', // Отключаем WebSocket если wsEnabled = false
    token: token, // Передаем токен для подключения через query параметры
    onMessage: (message) => {
      if (message.type === 'notification') {
        const notificationType = message.notification_type || 'info'
        
        switch (notificationType) {
          case 'success':
            showSuccess(message.message || message.title || 'Уведомление')
            break
          case 'error':
            showError(message.message || message.title || 'Ошибка')
            break
          case 'warning':
            showInfo(message.message || message.title || 'Предупреждение')
            break
          default:
            showInfo(message.message || message.title || 'Уведомление')
        }
      } else if (message.type === 'connected') {
        console.log('WebSocket connected:', message.message)
        if (!message.authenticated && token) {
          // Если токен не был передан через query параметры, отправляем через сообщение
          sendMessage({ type: 'auth', token })
        }
      } else if (message.type === 'auth_success') {
        console.log('WebSocket authentication successful')
      } else if (message.type === 'auth_error') {
        console.error('WebSocket authentication error:', message.message)
      }
    },
    onError: (error) => {
      console.error('WebSocket connection error:', error)
      // После нескольких неудачных попыток отключаем WebSocket
      // чтобы не засорять консоль ошибками
      const errorCount = parseInt(localStorage.getItem('ws_error_count') || '0')
      if (errorCount >= 5) {
        console.warn('WebSocket disabled after multiple connection failures')
        setWsEnabled(false)
        localStorage.removeItem('ws_error_count')
      } else {
        localStorage.setItem('ws_error_count', String(errorCount + 1))
      }
    },
    onOpen: () => {
      console.log('WebSocket connected')
    },
    onClose: () => {
      console.log('WebSocket disconnected')
    },
    reconnectAttempts: wsEnabled ? 3 : 0, // Уменьшаем количество попыток переподключения
    reconnectInterval: 5000
  })

  // Если WebSocket отключен, не рендерим компонент
  if (!wsEnabled) {
    return null
  }

  return null // Компонент не рендерит UI, только обрабатывает уведомления
}

export default RealtimeNotifications

