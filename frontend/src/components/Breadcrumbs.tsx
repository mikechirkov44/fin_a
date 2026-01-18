import { Link, useLocation } from 'react-router-dom'
import './Breadcrumbs.css'

interface BreadcrumbItem {
  label: string
  path: string
}

const Breadcrumbs = () => {
  const location = useLocation()
  const pathnames = location.pathname.split('/').filter((x) => x)

  const getBreadcrumbLabel = (path: string): string => {
    const labels: Record<string, string> = {
      dashboard: 'Главное',
      realization: 'Продажи',
      input1: 'Закупки',
      input2: 'Активы/Пассивы',
      warehouses: 'Склады',
      inventory: 'Остатки',
      'cash-flow': 'ОДДС',
      'cash-flow-analysis': 'Анализ ДДС',
      'profit-loss': 'ОПУ',
      'profit-loss-analysis': 'Анализ ОПУ',
      balance: 'БАЛАНС',
      reference: 'Предприятие',
      'marketplace-integration': 'Интеграции',
      budget: 'Бюджетирование',
      'audit-log': 'История изменений',
      recommendations: 'Рекомендации',
      users: 'Пользователи',
      shipment: 'Отгрузка',
      settings: 'Настройки',
    }
    return labels[path] || path
  }

  // Если мы на главной странице, не показываем breadcrumbs
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Главное', path: '/dashboard' },
    ...pathnames.map((value, index) => {
      const to = `/${pathnames.slice(0, index + 1).join('/')}`
      return {
        label: getBreadcrumbLabel(value),
        path: to,
      }
    }),
  ]

  // Убираем дубликаты по path
  const uniqueBreadcrumbs = breadcrumbs.filter((crumb, index, self) => 
    index === self.findIndex((c) => c.path === crumb.path)
  )

  if (uniqueBreadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="breadcrumbs">
      {uniqueBreadcrumbs.map((crumb, index) => {
        const isLast = index === uniqueBreadcrumbs.length - 1
        return (
          <span key={`${crumb.path}-${index}`} className="breadcrumb-item">
            {isLast ? (
              <span className="breadcrumb-current">{crumb.label}</span>
            ) : (
              <>
                <Link to={crumb.path} className="breadcrumb-link">
                  {crumb.label}
                </Link>
                <span className="breadcrumb-separator">›</span>
              </>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default Breadcrumbs

