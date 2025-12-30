import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  notification_type?: string
  title?: string
  message?: string
  data?: any
  timestamp?: string
}

interface UseWebSocketOptions {
  url: string
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  reconnectInterval?: number
  reconnectAttempts?: number
  token?: string | null
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    token
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [reconnectCount, setReconnectCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      // Формируем WebSocket URL
      let wsUrl = url
      
      // Если URL уже содержит ws:// или wss://, используем как есть
      if (url.startsWith('ws://') || url.startsWith('wss://')) {
        wsUrl = url
      } else if (url.startsWith('http://')) {
        wsUrl = url.replace('http://', 'ws://')
      } else if (url.startsWith('https://')) {
        wsUrl = url.replace('https://', 'wss://')
      } else if (url.startsWith('/')) {
        // Если URL относительный (начинается с /), используем прокси Vite
        // Прокси обработает соединение и перенаправит на бэкенд
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}${url}`
      } else {
        // Если URL относительный без /, добавляем протокол и host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}/${url}`
      }
      
      // Добавляем токен из параметров или localStorage
      const authToken = token || localStorage.getItem('token')
      if (authToken) {
        const separator = wsUrl.includes('?') ? '&' : '?'
        wsUrl = `${wsUrl}${separator}token=${encodeURIComponent(authToken)}`
      }
      
      console.log('Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'))
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket opened successfully')
        setIsConnected(true)
        setReconnectCount(0)
        onOpen?.()
        
        // Отправляем ping каждые 30 секунд для поддержания соединения
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          } else {
            clearInterval(pingInterval)
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message.type)
          if (message.type === 'pong') {
            return // Игнорируем pong ответы
          }
          onMessage?.(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.error('WebSocket readyState:', ws.readyState)
        console.error('WebSocket URL:', wsUrl.replace(/token=[^&]+/, 'token=***'))
        onError?.(error)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          readyState: ws.readyState
        })
        setIsConnected(false)
        onClose?.()
        
        // Попытка переподключения только если соединение было закрыто неожиданно
        if (!event.wasClean && reconnectCount < reconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectCount + 1}/${reconnectAttempts})...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1)
            connect()
          }, reconnectInterval)
        } else if (event.wasClean) {
          console.log('WebSocket closed cleanly, not reconnecting')
        } else {
          console.log('Max reconnection attempts reached')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
    }
  }, [url, token, onMessage, onError, onOpen, onClose, reconnectInterval, reconnectAttempts, reconnectCount])

  useEffect(() => {
    // Подключаемся только если URL валидный
    if (url) {
      // Добавляем небольшую задержку для избежания проблем с инициализацией
      const timeoutId = setTimeout(() => {
        connect()
      }, 100)
      
      return () => {
        clearTimeout(timeoutId)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }
      }
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url, token, connect]) // Добавляем token в зависимости для переподключения при изменении токена

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  return {
    isConnected,
    sendMessage,
    reconnect: connect
  }
}

