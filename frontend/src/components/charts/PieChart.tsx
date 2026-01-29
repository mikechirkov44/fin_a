import { useMemo } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Pie, Doughnut } from 'react-chartjs-2'
import './PieChart.css'

// Регистрируем компоненты Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
)

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
  // Преобразуем и валидируем данные
  const validData = useMemo(() => {
    return data
      .map(item => {
        let numValue = 0
        if (typeof item.value === 'number') {
          numValue = item.value
        } else if (typeof item.value === 'string') {
          const parsed = parseFloat(String(item.value).replace(/\s/g, '').replace(',', '.'))
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
  }, [data])

  // Вычисляем общую сумму
  const totalValue = useMemo(() => {
    return validData.reduce((sum, item) => sum + item.value, 0)
  }, [validData])

  // Преобразуем данные в формат Chart.js
  const chartData = useMemo(() => {
    if (validData.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 1
        }]
      }
    }

    return {
      labels: validData.map(item => item.label),
      datasets: [{
        data: validData.map(item => item.value),
        backgroundColor: validData.map((_, index) => colors[index % colors.length]),
        borderColor: '#fff',
        borderWidth: 2
      }]
    }
  }, [validData, colors])

  // Опции для Chart.js
  const chartOptions = useMemo(() => {
    const showLegend = options.showLegend !== false

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'right' as const,
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 14
            },
            generateLabels: (chart: any) => {
              const data = chart.data
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label: string, index: number) => {
                  const value = data.datasets[0].data[index]
                  const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
                  const formattedValue = value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
                  
                  return {
                    text: `${label}: ${formattedValue} ₽ (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[index],
                    strokeStyle: data.datasets[0].borderColor,
                    lineWidth: data.datasets[0].borderWidth,
                    hidden: false,
                    index: index
                  }
                })
              }
              return []
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0.0'
              const formattedValue = value.toLocaleString('ru-RU', { minimumFractionDigits: 2 })
              
              if (options.labelInterpolationFnc) {
                return `${label}: ${options.labelInterpolationFnc(value)}`
              }
              
              return `${label}: ${formattedValue} ₽ (${percentage}%)`
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
            size: 16,
            weight: 'bold' as const
          },
          bodyFont: {
            size: 15
          }
        }
      },
      cutout: options.donut ? `${options.donutWidth || 60}%` : 0,
      rotation: options.startAngle ? (options.startAngle * Math.PI) / 180 : 0
    }
  }, [options, totalValue])

  // Если нет данных, показываем сообщение
  if (validData.length === 0 || totalValue === 0) {
    return (
      <div className={`pie-chart-wrapper ${className}`} style={{ height: `${height}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '14px' }}>
          Нет данных для отображения
        </div>
      </div>
    )
  }

  const ChartComponent = options.donut ? Doughnut : Pie

  return (
    <div className={`pie-chart-wrapper ${className}`} style={{ height: `${height}px` }}>
      <ChartComponent data={chartData} options={chartOptions} />
    </div>
  )
}

export default PieChart
