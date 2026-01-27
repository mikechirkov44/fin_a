import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import './LineChart.css'

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface LineChartProps {
  data: {
    labels: string[]
    series: number[][] | number[]
  }
  options?: {
    lineSmooth?: boolean
    showPoint?: boolean
    showArea?: boolean
    chartPadding?: {
      left?: number
      right?: number
      top?: number
      bottom?: number
    }
    axisX?: {
      showGrid?: boolean
      showLabel?: boolean
      labelOffset?: {
        x?: number
        y?: number
      }
    }
    axisY?: {
      showGrid?: boolean
      showLabel?: boolean
      onlyInteger?: boolean
      labelInterpolationFnc?: (value: number) => string
    }
  }
  responsiveOptions?: any[]
  height?: number
  className?: string
  colors?: string[]
  showTooltip?: boolean
  tooltipFormatter?: (value: number, label: string, seriesIndex: number, seriesName?: string) => string
}

const LineChart = ({ 
  data, 
  options = {}, 
  responsiveOptions: any, 
  height = 300, 
  className = '', 
  colors = ['#4a90e2', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'], 
  showTooltip = true, 
  tooltipFormatter 
}: LineChartProps) => {
  // Преобразуем данные из формата Chartist в формат Chart.js
  const chartData = useMemo(() => {
    const seriesArray = Array.isArray(data.series[0]) ? data.series as number[][] : [data.series as number[]]
    
    return {
      labels: data.labels,
      datasets: seriesArray.map((series, index) => {
        const color = colors[index % colors.length]
        return {
          label: `Серия ${index + 1}`,
          data: series,
          borderColor: color,
          backgroundColor: options.showArea 
            ? color + '33' // Добавляем прозрачность для заливки
            : 'transparent',
          borderWidth: 3,
          pointRadius: options.showPoint !== false ? 4 : 0,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointBorderWidth: 2,
          fill: options.showArea || false,
          tension: options.lineSmooth !== false ? 0.4 : 0,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }
      })
    }
  }, [data, colors, options.showArea, options.showPoint, options.lineSmooth])

  // Преобразуем опции Chartist в опции Chart.js
  const chartOptions = useMemo(() => {
    const defaultLabelInterpolation = (value: number) => {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return '0'
      }
      return value.toLocaleString('ru-RU')
    }

    const labelInterpolationFnc = options.axisY?.labelInterpolationFnc || defaultLabelInterpolation

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: showTooltip,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y
              const label = context.label
              const datasetIndex = context.datasetIndex
              
              if (tooltipFormatter) {
                return tooltipFormatter(value, label, datasetIndex)
              }
              
              const formattedValue = typeof value === 'number' && !isNaN(value) && isFinite(value)
                ? value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
                : '0.00'
              return `${label}: ${formattedValue}`
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          titleFont: {
            size: 14,
            weight: 'bold' as const
          },
          bodyFont: {
            size: 13
          }
        }
      },
      scales: {
        x: {
          display: options.axisX?.showLabel !== false,
          grid: {
            display: options.axisX?.showGrid !== false,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            padding: options.axisX?.labelOffset?.y || 10
          }
        },
        y: {
          display: options.axisY?.showLabel !== false,
          grid: {
            display: options.axisY?.showGrid !== false,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            stepSize: options.axisY?.onlyInteger ? 1 : undefined,
            callback: function(value: any) {
              if (typeof value === 'number') {
                return labelInterpolationFnc(value)
              }
              return value
            }
          },
          beginAtZero: false
        }
      },
      layout: {
        padding: {
          left: options.chartPadding?.left || 20,
          right: options.chartPadding?.right || 20,
          top: options.chartPadding?.top || 20,
          bottom: options.chartPadding?.bottom || 20
        }
      }
    }
  }, [options, showTooltip, tooltipFormatter])

  return (
    <div className={`line-chart-container ${className}`} style={{ height: `${height}px` }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  )
}

export default LineChart
