import { useEffect, useRef } from 'react'
// @ts-ignore
import { LineChart as ChartistLineChart, Interpolation } from 'chartist'
import 'chartist/dist/index.css'
import './LineChart.css'

// Создаем объект Chartist для совместимости с типами и API
const Chartist = {
  Line: ChartistLineChart,
  Interpolation: Interpolation
} as any

interface LineChartProps {
  data: {
    labels: string[]
    series: number[][] | number[]
  }
  options?: Chartist.ILineChartOptions
  responsiveOptions?: Array<Chartist.IResponsiveOptionTuple<Chartist.ILineChartOptions>>
  height?: number
  className?: string
  colors?: string[]
  showTooltip?: boolean
  tooltipFormatter?: (value: number, label: string, seriesIndex: number, seriesName?: string) => string
}

const LineChart = ({ data, options, responsiveOptions, height = 300, className = '', colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'], showTooltip = true, tooltipFormatter }: LineChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chartist.IChartistLineChart | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const defaultOptions: Chartist.ILineChartOptions = {
      height,
      showPoint: true,
      showLine: true,
      showArea: false,
      fullWidth: true,
      chartPadding: {
        right: 40,
        top: 20,
        bottom: 50,
        left: 120  // Увеличено для полной видимости значений оси Y
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
        },
        // Default label interpolation, can be overridden by options prop
        labelInterpolationFnc: (value: number) => {
          if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            return '0'
          }
          return value.toLocaleString('ru-RU')
        }
      },
      lineSmooth: Chartist.Interpolation.cardinal({
        tension: 0.5
      }),
      ...options
    }

    chartInstance.current = new Chartist.Line(chartRef.current, data, defaultOptions, responsiveOptions)

    // Создаем tooltip элемент
    if (showTooltip && !tooltipRef.current && chartRef.current) {
      const tooltip = document.createElement('div')
      tooltip.className = 'line-chart-tooltip'
      tooltipRef.current = tooltip
      chartRef.current.appendChild(tooltip)
    }

    // Применяем цвета, анимации и tooltips
    const applyStyles = () => {
      const svg = chartRef.current?.querySelector('svg')
      if (!svg) return

      const seriesArray = Array.isArray(data.series[0]) ? data.series as number[][] : [data.series as number[]]
      const seriesCount = seriesArray.length
      const pointsPerSeries = seriesArray[0]?.length || 0

      // Применяем цвета к линиям
      const lines = svg.querySelectorAll('.ct-line')
      lines.forEach((line, index) => {
        const color = colors[index % colors.length]
        if (line instanceof SVGPathElement) {
          line.style.stroke = color
          line.style.strokeWidth = '3px'
        }
      })

      // Применяем цвета к точкам и добавляем tooltips
      // В Chartist.js точки могут быть сгруппированы по сериям
      const seriesGroups = svg.querySelectorAll('.ct-series')
      let globalPointIndex = 0
      
      seriesGroups.forEach((seriesGroup, seriesIndex) => {
        const points = seriesGroup.querySelectorAll('.ct-point')
        const color = colors[seriesIndex % colors.length]
        
        points.forEach((point, pointIndexInSeries) => {
          if (point instanceof SVGCircleElement) {
            point.style.fill = color
            point.style.stroke = color
            point.style.cursor = 'pointer'
            point.style.transition = 'r 0.2s ease'
            
            if (showTooltip && pointIndexInSeries < data.labels.length && seriesIndex < seriesCount) {
              const label = data.labels[pointIndexInSeries]
              const value = seriesArray[seriesIndex]?.[pointIndexInSeries]
              
              if (value !== undefined && value !== null) {
                let tooltipText = ''
                if (tooltipFormatter) {
                  tooltipText = tooltipFormatter(value, label, seriesIndex)
                } else {
                  const formattedValue = typeof value === 'number' && !isNaN(value) && isFinite(value)
                    ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
                    : '0'
                  tooltipText = `${label}\n${formattedValue}`
                }
                
                // Удаляем старые обработчики, если они есть
                const newPoint = point.cloneNode(true) as SVGCircleElement
                point.parentNode?.replaceChild(newPoint, point)
                
                newPoint.addEventListener('mouseenter', (e) => {
                  if (tooltipRef.current) {
                    const chartRect = chartRef.current?.getBoundingClientRect()
                    if (chartRect) {
                      const x = e.clientX - chartRect.left
                      const y = e.clientY - chartRect.top
                      
                      tooltipRef.current.textContent = tooltipText
                      tooltipRef.current.style.left = `${x}px`
                      tooltipRef.current.style.top = `${y - 50}px`
                      tooltipRef.current.style.transform = 'translateX(-50%)'
                      tooltipRef.current.classList.add('visible', 'bottom')
                      tooltipRef.current.classList.remove('top', 'left', 'right')
                    }
                  }
                  // Увеличиваем точку при наведении
                  newPoint.setAttribute('r', '6')
                })
                
                newPoint.addEventListener('mouseleave', () => {
                  if (tooltipRef.current) {
                    tooltipRef.current.classList.remove('visible')
                  }
                  // Возвращаем размер точки
                  newPoint.setAttribute('r', '4')
                })
                
                newPoint.addEventListener('mousemove', (e) => {
                  if (tooltipRef.current && chartRef.current) {
                    const chartRect = chartRef.current.getBoundingClientRect()
                    const x = e.clientX - chartRect.left
                    const y = e.clientY - chartRect.top
                    
                    tooltipRef.current.style.left = `${x}px`
                    tooltipRef.current.style.top = `${y - 50}px`
                  }
                })
              }
            }
          }
          globalPointIndex++
        })
      })
      
      // Если точки не сгруппированы по сериям, используем старый метод
      if (seriesGroups.length === 0) {
        const points = svg.querySelectorAll('.ct-point')
        points.forEach((point, index) => {
          const seriesIndex = Math.floor(index / pointsPerSeries)
          const pointIndex = index % pointsPerSeries
          const color = colors[seriesIndex % colors.length]
          
          if (point instanceof SVGCircleElement) {
            point.style.fill = color
            point.style.stroke = color
            point.style.cursor = 'pointer'
            point.style.transition = 'r 0.2s ease'
            
            if (showTooltip && pointIndex < data.labels.length && seriesIndex < seriesCount) {
              const label = data.labels[pointIndex]
              const value = seriesArray[seriesIndex]?.[pointIndex]
              
              if (value !== undefined && value !== null) {
                let tooltipText = ''
                if (tooltipFormatter) {
                  tooltipText = tooltipFormatter(value, label, seriesIndex)
                } else {
                  const formattedValue = typeof value === 'number' && !isNaN(value) && isFinite(value)
                    ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
                    : '0'
                  tooltipText = `${label}\n${formattedValue}`
                }
                
                point.addEventListener('mouseenter', (e) => {
                  if (tooltipRef.current) {
                    const chartRect = chartRef.current?.getBoundingClientRect()
                    if (chartRect) {
                      const x = e.clientX - chartRect.left
                      const y = e.clientY - chartRect.top
                      
                      tooltipRef.current.textContent = tooltipText
                      tooltipRef.current.style.left = `${x}px`
                      tooltipRef.current.style.top = `${y - 50}px`
                      tooltipRef.current.style.transform = 'translateX(-50%)'
                      tooltipRef.current.classList.add('visible', 'bottom')
                      tooltipRef.current.classList.remove('top', 'left', 'right')
                    }
                  }
                  point.setAttribute('r', '6')
                })
                
                point.addEventListener('mouseleave', () => {
                  if (tooltipRef.current) {
                    tooltipRef.current.classList.remove('visible')
                  }
                  point.setAttribute('r', '4')
                })
                
                point.addEventListener('mousemove', (e) => {
                  if (tooltipRef.current && chartRef.current) {
                    const chartRect = chartRef.current.getBoundingClientRect()
                    const x = e.clientX - chartRect.left
                    const y = e.clientY - chartRect.top
                    
                    tooltipRef.current.style.left = `${x}px`
                    tooltipRef.current.style.top = `${y - 50}px`
                  }
                })
              }
            }
          }
        })
      }

      // Применяем цвета к областям
      const areas = svg.querySelectorAll('.ct-area')
      areas.forEach((area, index) => {
        const color = colors[index % colors.length]
        if (area instanceof SVGPathElement) {
          area.style.fill = color
          area.style.fillOpacity = '0.1'
        }
      })
    }

    // Применяем стили после рендеринга
    setTimeout(applyStyles, 100)

    // Подписываемся на события обновления
    chartInstance.current.on('draw', (data: any) => {
      if (data.type === 'line' || data.type === 'point' || data.type === 'area') {
        setTimeout(applyStyles, 50)
      }
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

  return <div ref={chartRef} className={`ct-chart ct-line-chart ${className}`} style={{ height: `${height}px` }} />
}

export default LineChart
