import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useState, useEffect, useRef } from 'react'
import Notifications from './Notifications'
import CompanySelector from './CompanySelector'
import Breadcrumbs from './Breadcrumbs'
import { referenceService } from '../services/api'
import './Layout.css'
import { 
  HiOutlineHome, 
  HiOutlineTag, 
  HiOutlineShoppingCart,
  HiOutlineChartBar,
  HiOutlineBuildingOffice2,
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
  HiOutlineBuildingOffice,
  HiOutlineDocumentText,
  HiOutlineCog6Tooth,
  HiOutlineQuestionMarkCircle,
  HiOutlineUserGroup,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineCreditCard
} from 'react-icons/hi2'
import { 
  HiOutlineLightningBolt,
  HiOutlineTrendingUp,
  HiOutlineLink
} from 'react-icons/hi'

interface MenuItem {
  path: string
  label: string
  icon: React.ReactNode
  children?: { path: string; label: string }[]
}

const Layout = () => {
  const { user, logout, selectedCompanyId, setSelectedCompany, isAdmin } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const location = useLocation()
  const [companies, setCompanies] = useState<any[]>([])
  
  // Автоматически раскрываем раздел, если открыта его страница
  const getInitialExpanded = () => {
    const financePaths = ['/cash-flow', '/profit-loss', '/balance', '/cash-flow-analysis', '/profit-loss-analysis']
    const bankCashPaths = ['/bank-cash', '/account-balances']
    const warehousePaths = ['/inventory-transactions', '/warehouse-reports']
    const referencePaths = ['/reference', '/warehouses', '/customers', '/suppliers']
    if (financePaths.includes(location.pathname)) {
      return ['/cash-flow']
    }
    if (bankCashPaths.includes(location.pathname)) {
      return ['/bank-cash']
    }
    if (warehousePaths.includes(location.pathname)) {
      return ['/inventory-transactions']
    }
    if (referencePaths.includes(location.pathname)) {
      return ['/reference']
    }
    return []
  }
  
  const [expandedItems, setExpandedItems] = useState<string[]>(getInitialExpanded())
  const manuallyCollapsedRef = useRef<Set<string>>(new Set())
  
  // Загружаем организации
  useEffect(() => {
    loadCompanies()
  }, [user])
  
  const loadCompanies = async () => {
    try {
      if (user?.role === 'ADMIN') {
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      } else if (user?.companies && user.companies.length > 0) {
        const allCompanies = await referenceService.getCompanies()
        const userCompanyIds = user.companies.map(uc => uc.company_id)
        setCompanies(allCompanies.filter((c: any) => 
          c.is_active && userCompanyIds.includes(c.id)
        ))
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }
  
  // Обновляем раскрытые разделы при изменении пути (только если они не были свернуты вручную)
  useEffect(() => {
    const financePaths = ['/cash-flow', '/profit-loss', '/balance', '/cash-flow-analysis', '/profit-loss-analysis']
    const bankCashPaths = ['/bank-cash', '/account-balances']
    const warehousePaths = ['/inventory-transactions', '/warehouse-reports']
    const referencePaths = ['/reference', '/warehouses', '/customers', '/suppliers']
    
    if (financePaths.includes(location.pathname) && 
        !expandedItems.includes('/cash-flow') && 
        !manuallyCollapsedRef.current.has('/cash-flow')) {
      setExpandedItems(prev => [...prev, '/cash-flow'])
    }
    if (bankCashPaths.includes(location.pathname) && 
        !expandedItems.includes('/bank-cash') && 
        !manuallyCollapsedRef.current.has('/bank-cash')) {
      setExpandedItems(prev => [...prev, '/bank-cash'])
    }
    if (warehousePaths.includes(location.pathname) && 
        !expandedItems.includes('/inventory-transactions') && 
        !manuallyCollapsedRef.current.has('/inventory-transactions')) {
      setExpandedItems(prev => [...prev, '/inventory-transactions'])
    }
    if (referencePaths.includes(location.pathname) && 
        !expandedItems.includes('/reference') && 
        !manuallyCollapsedRef.current.has('/reference')) {
      setExpandedItems(prev => [...prev, '/reference'])
    }
  }, [location.pathname])

  // Проверяем, является ли пользователь администратором (глобально или в организации)
  const isGlobalAdmin = user?.role === 'ADMIN'
  const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false
  const canManageUsers = isGlobalAdmin || hasAdminRoleInCompany

  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Главное', icon: <HiOutlineHome /> },
    { path: '/realization', label: 'Продажи', icon: <HiOutlineTag /> },
    { 
      path: '/bank-cash', 
      label: 'Банк/Касса', 
      icon: <HiOutlineCreditCard />,
      children: [
        { path: '/bank-cash', label: 'Движения денежных средств' },
        { path: '/account-balances', label: 'Остатки на счетах' },
      ]
    },
    { path: '/input2', label: 'Активы/Пассивы', icon: <HiOutlineChartBar /> },
    { 
      path: '/inventory-transactions', 
      label: 'Склады и остатки', 
      icon: <HiOutlineBuildingOffice2 />,
      children: [
        { path: '/inventory-transactions', label: 'Отгрузки и поступления товаров' },
        { path: '/warehouse-reports', label: 'Отчеты по складам' },
      ]
    },
    { 
      path: '/cash-flow', 
      label: 'Финансы', 
      icon: <HiOutlineCurrencyDollar />,
      children: [
        { path: '/cash-flow', label: 'ОДДС' },
        { path: '/cash-flow-analysis', label: 'Анализ ДДС' },
        { path: '/profit-loss', label: 'ОПУ' },
        { path: '/profit-loss-analysis', label: 'Анализ ОПУ' },
        { path: '/balance', label: 'БАЛАНС' },
      ]
    },
    { 
      path: '/reference', 
      label: 'Предприятие', 
      icon: <HiOutlineBuildingOffice />,
      children: [
        { path: '/reference', label: 'Основные данные' },
        { path: '/warehouses', label: 'Склады' },
        { path: '/customers', label: 'Клиенты' },
        { path: '/suppliers', label: 'Поставщики' },
      ]
    },
    { path: '/recommendations', label: 'Рекомендации', icon: <HiOutlineLightningBolt /> },
    { path: '/marketplace-integration', label: 'Интеграции', icon: <HiOutlineLink /> },
    { path: '/budget', label: 'Бюджетирование', icon: <HiOutlineTrendingUp /> },
    { path: '/audit-log', label: 'История изменений', icon: <HiOutlineDocumentText /> },
    { path: '/settings', label: 'Настройки', icon: <HiOutlineCog6Tooth /> },
    { path: '/help', label: 'Справка', icon: <HiOutlineQuestionMarkCircle /> },
    ...(canManageUsers ? [{ path: '/users', label: 'Пользователи', icon: <HiOutlineUserGroup /> }] : []),
  ]

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => {
      const isCurrentlyExpanded = prev.includes(path)
      if (isCurrentlyExpanded) {
        // Пользователь сворачивает меню вручную
        manuallyCollapsedRef.current.add(path)
        return prev.filter(p => p !== path)
      } else {
        // Пользователь разворачивает меню вручную
        manuallyCollapsedRef.current.delete(path)
        return [...prev, path]
      }
    })
  }

  const isItemActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some(child => child.path === location.pathname)
    }
    return location.pathname === item.path
  }

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Главное',
    '/realization': 'Продажи',
    '/bank-cash': 'Движения денежных средств',
    '/account-balances': 'Остатки на счетах',
    '/input2': 'Активы/Пассивы',
    '/balance': 'БАЛАНС',
    '/cash-flow': 'ОДДС',
    '/cash-flow-analysis': 'Анализ ДДС',
    '/profit-loss': 'ОПУ',
    '/profit-loss-analysis': 'Анализ ОПУ',
    '/shipment': 'ОТГРУЗКА',
    '/warehouses': 'Склады',
    '/inventory': 'Остатки',
    '/inventory-transactions': 'Отгрузки и поступления товаров',
    '/warehouse-reports': 'Отчеты по складам',
    '/customers': 'Клиенты',
    '/suppliers': 'Поставщики',
    '/reference': 'Предприятие',
    '/marketplace-integration': 'Интеграции с маркетплейсами',
    '/budget': 'Бюджетирование',
    '/audit-log': 'История изменений',
    '/settings': 'Настройки',
    '/help': 'Справка',
    '/users': 'Управление пользователями',
  }

  const getPageTitle = () => {
    return pageTitles[location.pathname] || 'Главное'
  }

  return (
    <div className="layout">
      {/* Верхняя панель */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="app-title">Управление предприятием v.1.0</div>
        </div>
        <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Notifications />
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            title={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
          >
            {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
          </button>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {user.username} ({user.role === 'ADMIN' ? 'Администратор' : user.role === 'ACCOUNTANT' ? 'Бухгалтер' : user.role === 'MANAGER' ? 'Менеджер' : 'Просмотр'})
              </span>
              <button 
                onClick={logout} 
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--danger-color, #dc3545)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--input-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                Выход
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="layout-body">
        {/* Боковая панель навигации */}
        <aside className="sidebar">
          {companies.length > 0 && (
            <div className="sidebar-company-selector">
              <CompanySelector />
            </div>
          )}
          <nav className="sidebar-nav">
            <ul>
              {menuItems.map((item) => {
                const isActive = isItemActive(item)
                const isExpanded = expandedItems.includes(item.path)
                const hasChildren = item.children && item.children.length > 0
                
                return (
                  <li key={item.path}>
                    {hasChildren ? (
                      <>
                        <div
                          className={`sidebar-item ${isActive ? 'active' : ''}`}
                          onClick={() => toggleExpanded(item.path)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className={`sidebar-icon ${isActive ? 'active' : ''}`}>
                            {item.icon}
                          </span>
                          <span className="sidebar-label">{item.label}</span>
                          <span className={`sidebar-arrow ${isExpanded ? 'expanded' : ''}`}>
                            {isExpanded ? '▼' : '›'}
                          </span>
                        </div>
                        {isExpanded && (
                          <ul className="sidebar-submenu">
                            {item.children!.map((child) => {
                              const isChildActive = location.pathname === child.path
                              return (
                                <li key={child.path}>
                                  <Link
                                    to={child.path}
                                    className={`sidebar-submenu-item ${isChildActive ? 'active' : ''}`}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.path}
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                      >
                        <span className={`sidebar-icon ${isActive ? 'active' : ''}`}>
                          {item.icon}
                        </span>
                        <span className="sidebar-label">{item.label}</span>
                        <span className="sidebar-arrow">›</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Основная область контента */}
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
          <Breadcrumbs />
          <div className="content-body">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
