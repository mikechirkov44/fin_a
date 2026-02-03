import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const Tooltip = ({ content, children, position = 'top', delay = 200 }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<number | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      // Даем время на рендер перед обновлением позиции
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition()
        })
      })
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    
    // Если tooltip еще не отрендерился (нулевые размеры), ждем
    if (tooltipRect.width === 0 && tooltipRect.height === 0) {
      return
    }
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const margin = 8

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - margin
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        
        // Проверяем, не выходит ли за верхнюю границу
        if (top < margin) {
          // Переключаемся на bottom
          top = triggerRect.bottom + margin
        }
        
        // Проверяем горизонтальные границы
        if (left < margin) {
          left = margin
        } else if (left + tooltipRect.width > viewportWidth - margin) {
          left = viewportWidth - tooltipRect.width - margin
        }
        break
        
      case 'bottom':
        top = triggerRect.bottom + margin
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        
        // Проверяем, не выходит ли за нижнюю границу
        if (top + tooltipRect.height > viewportHeight - margin) {
          // Переключаемся на top
          top = triggerRect.top - tooltipRect.height - margin
        }
        
        // Проверяем горизонтальные границы
        if (left < margin) {
          left = margin
        } else if (left + tooltipRect.width > viewportWidth - margin) {
          left = viewportWidth - tooltipRect.width - margin
        }
        break
        
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.left - tooltipRect.width - margin
        
        // Проверяем, не выходит ли за левую границу
        if (left < margin) {
          // Переключаемся на right
          left = triggerRect.right + margin
        }
        
        // Проверяем вертикальные границы
        if (top < margin) {
          top = margin
        } else if (top + tooltipRect.height > viewportHeight - margin) {
          top = viewportHeight - tooltipRect.height - margin
        }
        break
        
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.right + margin
        
        // Проверяем, не выходит ли за правую границу
        if (left + tooltipRect.width > viewportWidth - margin) {
          // Переключаемся на left
          left = triggerRect.left - tooltipRect.width - margin
        }
        
        // Проверяем вертикальные границы
        if (top < margin) {
          top = margin
        } else if (top + tooltipRect.height > viewportHeight - margin) {
          top = viewportHeight - tooltipRect.height - margin
        }
        break
    }

    setTooltipPosition({ top, left })
  }

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      // Используем несколько requestAnimationFrame для гарантии, что элемент отрендерился
      const update = () => {
        if (tooltipRef.current) {
          updatePosition()
        }
      }
      
      // Первое обновление сразу
      requestAnimationFrame(() => {
        // Второе обновление после рендера
        requestAnimationFrame(() => {
          update()
        })
      })
      
      const handleScroll = () => {
        if (tooltipRef.current) {
          updatePosition()
        }
      }
      const handleResize = () => {
        if (tooltipRef.current) {
          updatePosition()
        }
      }
      
      // Используем capture phase для перехвата всех событий скролла
      document.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        document.removeEventListener('scroll', handleScroll, true)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isVisible, position])

  const tooltipContent = isVisible ? (
    <div
      ref={tooltipRef}
      className={`tooltip tooltip-${position}`}
      style={{
        position: 'fixed',
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
      }}
    >
      {content}
    </div>
  ) : null

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
}

export default Tooltip

