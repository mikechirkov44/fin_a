import { useEffect, useRef } from 'react'
// @ts-ignore
import { BarChart as ChartistBarChart } from 'chartist'
import 'chartist/dist/index.css'
import './BarChart.css'

// Создаем объект Chartist для совместимости с типами
const Chartist = {
  Bar: ChartistBarChart
} as any

interface BarChartProps {
  data: {
    labels: string[]
    series: number[][] | number[]
  }
  options?: Chartist.IBarChartOptions
  responsiveOptions?: Array<Chartist.IResponsiveOptionTuple<Chartist.IBarChartOptions>>
  height?: number
  className?: string
  colors?: string[]
  showTooltip?: boolean
  tooltipFormatter?: (value: number, label: string, seriesIndex: number) => string
}

const BarChart = ({ 
  data, 
  options, 
  responsiveOptions, 
  height = 300, 
  className = '', 
  colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'],
  showTooltip = true,
  tooltipFormatter
}: BarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chartist.IChartistBarChart | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const defaultOptions: Chartist.IBarChartOptions = {
      height,
      fullWidth: true,
      chartPadding: {
        right: 40,
        top: 20,
        bottom: 50,
        left: 80  // Увеличено для лучшей видимости значений оси Y
      },
      axisX: {
        showGrid: true,
        showLabel: true,
        labelOffset: {
          x: 0,
          y: 20
        }
      },
      axisY: {
        showGrid: true,
        showLabel: true,
        onlyInteger: false,
        labelOffset: {
          x: 0,
          y: 0
        }
      },
      ...options
    }

    chartInstance.current = new Chartist.Bar(chartRef.current, data, defaultOptions, responsiveOptions)

    // Создаем tooltip элемент
    if (showTooltip && !tooltipRef.current && chartRef.current) {
      const tooltip = document.createElement('div')
      tooltip.className = 'bar-chart-tooltip'
      tooltipRef.current = tooltip
      chartRef.current.appendChild(tooltip)
    }

    // Применяем цвета, обновляем метки оси Y и добавляем tooltips
    const applyStylesAndTooltips = () => {
      const svg = chartRef.current?.querySelector('svg')
      if (!svg) return

      // Принудительно обновляем метки оси Y, если есть labelInterpolationFnc
      if (defaultOptions.axisY?.labelInterpolationFnc) {
        const yLabels = svg.querySelectorAll('.ct-axis-y .ct-label')
        yLabels.forEach((label) => {
          const textElement = label.querySelector('text')
          if (textElement) {
            const currentText = textElement.textContent || ''
            // Пытаемся извлечь числовое значение из текущего текста
            const match = currentText.match(/(-?\d+\.?\d*)/)
            if (match) {
              const numValue = parseFloat(match[1])
              if (!isNaN(numValue)) {
                const formatted = defaultOptions.axisY.labelInterpolationFnc(numValue)
                textElement.textContent = formatted
              }
            }
          }
        })
      }

      const bars = svg.querySelectorAll('.ct-bar')
      const seriesCount = Array.isArray(data.series[0]) ? data.series.length : 1
      
      bars.forEach((bar, index) => {
        // Определяем индекс серии и столбца
        const seriesIndex = seriesCount > 1 ? Math.floor(index / (data.labels.length || 1)) : 0
        const barIndex = seriesCount > 1 ? (index % (data.labels.length || 1)) : index
        const color = colors[seriesIndex % colors.length]
        
        if (bar instanceof SVGPathElement || bar instanceof SVGRectElement) {
          bar.style.fill = color
          bar.style.stroke = color
          bar.style.cursor = 'pointer'
          bar.style.transition = 'opacity 0.2s ease'
          
          // Получаем значение и метку для tooltip
          if (showTooltip && barIndex < data.labels.length) {
            const label = data.labels[barIndex]
            const seriesData = Array.isArray(data.series[0]) ? data.series[seriesIndex] : data.series
            const value = Array.isArray(seriesData) ? seriesData[barIndex] : seriesData
            
            // Формируем текст tooltip
            let tooltipText = ''
            if (tooltipFormatter) {
              tooltipText = tooltipFormatter(value, label, seriesIndex)
            } else {
              const formattedValue = typeof value === 'number' && !isNaN(value) && isFinite(value)
                ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
                : '0'
              tooltipText = `${label}: ${formattedValue} ₽`
            }
            
            // Добавляем обработчики событий для tooltip
            bar.addEventListener('mouseenter', (e) => {
              if (tooltipRef.current) {
                const rect = bar.getBoundingClientRect()
                const chartRect = chartRef.current?.getBoundingClientRect()
                if (chartRect) {
                  const x = rect.left + rect.width / 2 - chartRect.left
                  const y = rect.top - chartRect.top
                  
                  // Используем innerHTML для поддержки переносов строк
                  tooltipRef.current.innerHTML = tooltipText.split('\n').map(line => line.trim()).filter(line => line).join('<br>')
                  tooltipRef.current.style.left = `${x}px`
                  tooltipRef.current.style.top = `${y - 45}px`
                  tooltipRef.current.style.transform = 'translateX(-50%)'
                  tooltipRef.current.classList.add('visible', 'bottom')
                  tooltipRef.current.classList.remove('top', 'left', 'right')
                }
              }
            })
            
            bar.addEventListener('mouseleave', () => {
              if (tooltipRef.current) {
                tooltipRef.current.classList.remove('visible')
              }
            })
            
            bar.addEventListener('mousemove', (e) => {
              if (tooltipRef.current && chartRef.current) {
                const chartRect = chartRef.current.getBoundingClientRect()
                const x = e.clientX - chartRect.left
                const y = e.clientY - chartRect.top
                
                tooltipRef.current.style.left = `${x}px`
                tooltipRef.current.style.top = `${y - 45}px`
              }
            })
            
            bar.addEventListener('mouseenter', () => {
              if (bar instanceof SVGPathElement || bar instanceof SVGRectElement) {
                bar.style.opacity = '0.8'
              }
            })
            
            bar.addEventListener('mouseleave', () => {
              if (bar instanceof SVGPathElement || bar instanceof SVGRectElement) {
                bar.style.opacity = '1'
              }
            })
          }
        }
      })
    }

    // Применяем стили после рендеринга
    setTimeout(applyStylesAndTooltips, 100)

    // Подписываемся на события обновления
    chartInstance.current.on('draw', (data: any) => {
      if (data.type === 'bar') {
        setTimeout(applyStylesAndTooltips, 50)
      }
      // Обновляем метки оси Y при их отрисовке
      if (data.type === 'label' && data.axis && data.axis.units && data.axis.units.pos === 'y' && defaultOptions.axisY?.labelInterpolationFnc) {
        const value = parseFloat(data.text)
        if (!isNaN(value) && isFinite(value)) {
          data.element.textContent = defaultOptions.axisY.labelInterpolationFnc(value)
        }
      }
    })
    
    chartInstance.current.on('created', () => {
      setTimeout(applyStylesAndTooltips, 100)
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.detach()
      }
      if (tooltipRef.current) {
        tooltipRef.current.remove()
        tooltipRef.current = null
      }
    }
  }, [data, options, responsiveOptions, height, colors, showTooltip, tooltipFormatter])

  return <div ref={chartRef} className={`ct-chart ct-bar-chart ${className}`} style={{ height: `${height}px` }} />
}

export default BarChart
