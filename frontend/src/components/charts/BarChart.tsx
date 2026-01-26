import { useEffect, useRef } from 'react'
// @ts-ignore
import { BarChart as ChartistBarChart } from 'chartist'
import 'chartist/dist/index.css'

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
}

const BarChart = ({ data, options, responsiveOptions, height = 300, className = '', colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'] }: BarChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chartist.IChartistBarChart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const defaultOptions: Chartist.IBarChartOptions = {
      height,
      fullWidth: true,
      chartPadding: {
        right: 60,
        top: 20,
        bottom: 50,
        left: 60
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
        onlyInteger: false
      },
      ...options
    }

    chartInstance.current = new Chartist.Bar(chartRef.current, data, defaultOptions, responsiveOptions)

    // Применяем цвета
    const applyStyles = () => {
      const svg = chartRef.current?.querySelector('svg')
      if (svg) {
        const bars = svg.querySelectorAll('.ct-bar')
        bars.forEach((bar, index) => {
          // Определяем индекс серии
          const seriesCount = Array.isArray(data.series[0]) ? data.series.length : 1
          const seriesIndex = seriesCount > 1 ? Math.floor(index / (data.labels.length || 1)) : 0
          const color = colors[seriesIndex % colors.length]
          if (bar instanceof SVGPathElement || bar instanceof SVGRectElement) {
            bar.style.fill = color
            bar.style.stroke = color
          }
        })
      }
    }

    // Применяем стили после рендеринга
    setTimeout(applyStyles, 100)

    // Подписываемся на события обновления
    chartInstance.current.on('draw', (data: any) => {
      if (data.type === 'bar') {
        setTimeout(applyStyles, 50)
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.detach()
      }
    }
  }, [data, options, responsiveOptions, height, colors])

  return <div ref={chartRef} className={`ct-chart ct-bar-chart ${className}`} style={{ height: `${height}px` }} />
}

export default BarChart
