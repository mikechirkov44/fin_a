import { useEffect, useRef } from 'react'
// @ts-ignore
import { PieChart as ChartistPieChart } from 'chartist'
import 'chartist/dist/index.css'

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

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return

    const chartistData = {
      labels: data.map(item => item.label),
      series: data.map(item => item.value)
    }

    const defaultOptions: Chartist.IPieChartOptions = {
      height,
      donut: options.donut || false,
      donutWidth: options.donutWidth || 60,
      startAngle: options.startAngle || 0,
      total: options.total,
      showLabel: options.showLabel !== false,
      labelInterpolationFnc: options.labelInterpolationFnc || ((value: number) => {
        const total = data.reduce((sum, item) => sum + item.value, 0)
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0
        return `${percentage}%`
      }),
      ...options
    }

    chartInstance.current = new Chartist.Pie(chartRef.current, chartistData, defaultOptions)

    // Применяем цвета
    if (chartInstance.current && colors) {
      const applyColors = () => {
        const svg = chartRef.current?.querySelector('svg')
        if (svg) {
          const paths = svg.querySelectorAll('.ct-slice-pie, .ct-slice-donut')
          paths.forEach((path, index) => {
            const color = colors[index % colors.length]
            if (path instanceof SVGPathElement) {
              path.style.fill = color
            }
          })
        }
      }
      
      // Применяем цвета после рендеринга
      setTimeout(applyColors, 100)
      
      // Подписываемся на события обновления
      chartInstance.current.on('draw', () => {
        setTimeout(applyColors, 50)
      })
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.detach()
      }
    }
  }, [data, options, height, colors])

  return <div ref={chartRef} className={`ct-chart ct-pie-chart ${className}`} style={{ height: `${height}px` }} />
}

export default PieChart
