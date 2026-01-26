import { useEffect, useRef } from 'react'
// @ts-ignore
import { LineChart as ChartistLineChart, Interpolation } from 'chartist'
import 'chartist/dist/index.css'

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
}

const LineChart = ({ data, options, responsiveOptions, height = 300, className = '', colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'] }: LineChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<Chartist.IChartistLineChart | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    const defaultOptions: Chartist.ILineChartOptions = {
      height,
      showPoint: true,
      showLine: true,
      showArea: false,
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
      lineSmooth: Chartist.Interpolation.cardinal({
        tension: 0.5
      }),
      ...options
    }

    chartInstance.current = new Chartist.Line(chartRef.current, data, defaultOptions, responsiveOptions)

    // Применяем цвета и анимации
    const applyStyles = () => {
      const svg = chartRef.current?.querySelector('svg')
      if (svg) {
        // Применяем цвета к линиям
        const lines = svg.querySelectorAll('.ct-line')
        lines.forEach((line, index) => {
          const color = colors[index % colors.length]
          if (line instanceof SVGPathElement) {
            line.style.stroke = color
            line.style.strokeWidth = '3px'
          }
        })

        // Применяем цвета к точкам
        const points = svg.querySelectorAll('.ct-point')
        points.forEach((point, index) => {
          const seriesIndex = Math.floor(index / (data.series[0]?.length || 1))
          const color = colors[seriesIndex % colors.length]
          if (point instanceof SVGCircleElement) {
            point.style.fill = color
            point.style.stroke = color
          }
        })

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
    }
  }, [data, options, responsiveOptions, height, colors])

  return <div ref={chartRef} className={`ct-chart ct-line-chart ${className}`} style={{ height: `${height}px` }} />
}

export default LineChart
