import { useEffect, useRef } from 'react'
// @ts-ignore
import { PieChart as ChartistPieChart } from 'chartist'
import 'chartist/dist/index.css'
import './PieChart.css'

// Создаем объект Chartist для совместимости с типами
const Chartist = {
  Pie: ChartistPieChart
} as any

interface PieChartData {
  label: string
  value: number
}

interface PieChartProps {
  data: PieChartData[]
  options?: {
    donut?: boolean
    donutWidth?: number
    startAngle?: number
    total?: number
    showLabel?: boolean
    labelInterpolationFnc?: (value: number) => string
    showLegend?: boolean
  }
  height?: number
  className?: string
  colors?: string[]
}

const PieChart = ({ 
  data, 
  options = {}, 
  height = 300, 
  className = '',
  colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e']
}: PieChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chartist.IChartistPieChart | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return

    // Преобразуем и валидируем данные
    const validData = data
      .map(item => {
        // Преобразуем значение в число, обрабатывая разные типы
        let numValue = 0
        if (typeof item.value === 'number') {
          numValue = item.value
        } else if (typeof item.value === 'string') {
          const parsed = parseFloat(item.value.replace(/\s/g, '').replace(',', '.'))
          numValue = !isNaN(parsed) && isFinite(parsed) ? parsed : 0
        } else if (item.value != null) {
          numValue = Number(item.value) || 0
        }
        
        return {
          label: item.label || '',
          value: numValue
        }
      })
      .filter(item => item.value > 0) // Фильтруем только положительные значения для отображения

    // Если нет данных для отображения, не рендерим диаграмму
    if (validData.length === 0) {
      if (chartRef.current) {
        chartRef.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">Нет данных для отображения</div>'
      }
      return
    }

    const chartistData = {
      labels: validData.map(item => item.label),
      series: validData.map(item => item.value)
    }

    // Вычисляем общую сумму один раз для использования в labelInterpolationFnc
    const totalValue = chartistData.series.reduce((sum, val) => {
      const numVal = typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0
      return sum + numVal
    }, 0)

    // Если сумма равна нулю, не рендерим диаграмму
    if (totalValue === 0) {
      if (chartRef.current) {
        chartRef.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">Нет данных для отображения</div>'
      }
      return
    }

    // Сохраняем исходные значения и метки для использования в labelInterpolationFnc
    const originalValues = [...chartistData.series]
    const originalLabels = [...chartistData.labels]

    // Определяем, показывать ли метки внутри диаграммы
    const showLabel = options.showLabel !== undefined ? options.showLabel : false
    const showLegend = options.showLegend !== false

    const defaultOptions: Chartist.IPieChartOptions = {
      height,
      donut: options.donut || false,
      donutWidth: options.donutWidth || 60,
      startAngle: options.startAngle || 0,
      total: options.total,
      showLabel: showLabel,
      labelInterpolationFnc: options.labelInterpolationFnc || ((value: number, index?: number) => {
        // Chartist передает значение из series напрямую
        let actualValue = value
        let label = ''
        
        // Если есть индекс, используем исходные значения и метки
        if (index !== undefined && index >= 0 && index < originalValues.length) {
          // Если переданное value слишком маленькое (возможно это процент), используем исходное
          if (value < 1 && originalValues[index] > 1) {
            actualValue = originalValues[index]
          } else if (value >= 1) {
            actualValue = originalValues[index]
          }
          label = originalLabels[index] || ''
        }
        
        // Вычисляем процент от исходного значения
        if (typeof actualValue !== 'number' || isNaN(actualValue) || !isFinite(actualValue)) {
          return '0%'
        }
        const percentage = totalValue > 0 ? Math.round((actualValue / totalValue) * 100) : 0
        return `${percentage}%`
      }),
      ...options
    }

    chartInstance.current = new Chartist.Pie(chartRef.current, chartistData, defaultOptions)

    // Создаем tooltip элемент
    if (!tooltipRef.current && chartRef.current) {
      const tooltip = document.createElement('div')
      tooltip.className = 'pie-chart-tooltip'
      tooltipRef.current = tooltip
      chartRef.current.appendChild(tooltip)
    }

    // Применяем цвета и добавляем tooltips
    if (chartInstance.current && colors) {
      const applyColorsAndTooltips = () => {
        const svg = chartRef.current?.querySelector('svg')
        if (!svg) return

        const paths = svg.querySelectorAll('.ct-slice-pie, .ct-slice-donut')
        const labels = svg.querySelectorAll('.ct-label')
        
        paths.forEach((path, index) => {
          const color = colors[index % colors.length]
          if (path instanceof SVGPathElement) {
            path.style.fill = color
            
            // Получаем данные для tooltip
            if (index < originalLabels.length && index < originalValues.length) {
              const label = originalLabels[index]
              const value = originalValues[index]
              const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
              const formattedValue = value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
              const tooltipText = `${label}: ${formattedValue} ₽ (${percentage}%)`
              
              // Добавляем обработчики событий для tooltip
              path.addEventListener('mouseenter', (e) => {
                if (tooltipRef.current) {
                  const rect = path.getBoundingClientRect()
                  const chartRect = chartRef.current?.getBoundingClientRect()
                  if (chartRect) {
                    const x = rect.left + rect.width / 2 - chartRect.left
                    const y = rect.top + rect.height / 2 - chartRect.top
                    
                    tooltipRef.current.textContent = tooltipText
                    tooltipRef.current.style.left = `${x}px`
                    tooltipRef.current.style.top = `${y - 40}px`
                    tooltipRef.current.style.transform = 'translateX(-50%)'
                    tooltipRef.current.classList.add('visible', 'bottom')
                    tooltipRef.current.classList.remove('top', 'left', 'right')
                  }
                }
              })
              
              path.addEventListener('mouseleave', () => {
                if (tooltipRef.current) {
                  tooltipRef.current.classList.remove('visible')
                }
              })
              
              path.addEventListener('mousemove', (e) => {
                if (tooltipRef.current && chartRef.current) {
                  const chartRect = chartRef.current.getBoundingClientRect()
                  const x = e.clientX - chartRect.left
                  const y = e.clientY - chartRect.top
                  
                  tooltipRef.current.style.left = `${x}px`
                  tooltipRef.current.style.top = `${y - 40}px`
                }
              })
            }
          }
        })
        
        // Обрабатываем длинные метки
        labels.forEach((label) => {
          if (label instanceof SVGTextElement) {
            const textLength = label.getComputedTextLength()
            if (textLength > 150) {
              label.classList.add('ct-label-long')
              label.setAttribute('title', label.textContent || '')
            }
          }
        })
      }
      
      // Применяем после рендеринга
      setTimeout(applyColorsAndTooltips, 100)
      
      // Подписываемся на события обновления
      chartInstance.current.on('draw', () => {
        setTimeout(applyColorsAndTooltips, 50)
      })
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.detach()
      }
      if (tooltipRef.current) {
        tooltipRef.current.remove()
        tooltipRef.current = null
      }
    }
  }, [data, options, height, colors])

  // Вычисляем данные для легенды
  const showLegend = options.showLegend !== false
  const legendData = data
    .map(item => {
      let numValue = 0
      if (typeof item.value === 'number') {
        numValue = item.value
      } else if (typeof item.value === 'string') {
        const parsed = parseFloat(item.value.replace(/\s/g, '').replace(',', '.'))
        numValue = !isNaN(parsed) && isFinite(parsed) ? parsed : 0
      } else if (item.value != null) {
        numValue = Number(item.value) || 0
      }
      return {
        label: item.label || '',
        value: numValue
      }
    })
    .filter(item => item.value > 0)

  const totalValue = legendData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={`pie-chart-wrapper ${className}`}>
      <div ref={chartRef} className={`ct-chart ct-pie-chart`} style={{ height: `${height}px` }} />
      {showLegend && legendData.length > 0 && (
        <div className="pie-chart-legend">
          {legendData.map((item, index) => {
            const percentage = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0.0'
            const formattedValue = item.value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
            const color = colors[index % colors.length]
            return (
              <div key={index} className="pie-chart-legend-item">
                <div className="pie-chart-legend-color" style={{ backgroundColor: color }}></div>
                <div className="pie-chart-legend-content">
                  <div className="pie-chart-legend-label">{item.label}</div>
                  <div className="pie-chart-legend-value">
                    {formattedValue} ₽ ({percentage}%)
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PieChart
