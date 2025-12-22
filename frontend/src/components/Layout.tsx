import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCompany } from '../contexts/CompanyContext'
import { useState, useEffect } from 'react'
import './Layout.css'

interface MenuItem {
  path: string
  label: string
  icon: string
  children?: { path: string; label: string }[]
}

const Layout = () => {
  const { user, logout } = useAuth()
  const { selectedCompanyId, setSelectedCompanyId, companies, selectedCompany } = useCompany()
  const location = useLocation()
  
  // Автоматически раскрываем раздел, если открыта его страница
  const getInitialExpanded = () => {
    const financePaths = ['/cash-flow', '/profit-loss', '/balance', '/cash-flow-analysis', '/profit-loss-analysis']
    if (financePaths.includes(location.pathname)) {
      return ['/cash-flow']
    }
    return []
  }
  
  const [expandedItems, setExpandedItems] = useState<string[]>(getInitialExpanded())
  
  // Обновляем раскрытые разделы при изменении пути
  useEffect(() => {
    const financePaths = ['/cash-flow', '/profit-loss', '/balance', '/cash-flow-analysis', '/profit-loss-analysis']
    if (financePaths.includes(location.pathname) && !expandedItems.includes('/cash-flow')) {
      setExpandedItems(['/cash-flow'])
    }
  }, [location.pathname, expandedItems])

  const menuItems: MenuItem[] = [
    { path: '/dashboard', label: 'Главное', icon: '🏠' },
    { path: '/realization', label: 'Продажи', icon: '🏷️' },
    { path: '/input1', label: 'Закупки', icon: '🛒' },
    { path: '/products', label: 'Товарные запасы', icon: '📦' },
    { 
      path: '/cash-flow', 
      label: 'Финансы', 
      icon: '💰',
      children: [
        { path: '/cash-flow', label: 'ОДДС' },
        { path: '/cash-flow-analysis', label: 'Анализ ДДС' },
        { path: '/profit-loss', label: 'ОПУ' },
        { path: '/profit-loss-analysis', label: 'Анализ ОПУ' },
        { path: '/balance', label: 'БАЛАНС' },
      ]
    },
    { path: '/reference', label: 'Предприятие', icon: '🏢' },
  ]

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path)
        : [...prev, path]
    )
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
    '/input1': 'Закупки',
    '/input2': 'ВВОД 2',
    '/balance': 'БАЛАНС',
    '/cash-flow': 'ОДДС',
    '/cash-flow-analysis': 'Анализ ДДС',
    '/profit-loss': 'ОПУ',
    '/profit-loss-analysis': 'Анализ ОПУ',
    '/shipment': 'ОТГРУЗКА',
    '/products': 'Товарные запасы',
    '/reference': 'Предприятие',
  }

  const getPageTitle = () => {
    return pageTitles[location.pathname] || 'Главное'
  }

  return (
    <div className="layout">
      {/* Верхняя панель */}
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="app-title">Финансовый анализ предприятия</div>
        </div>
        <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {companies.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', color: '#666', fontWeight: '500' }}>Организация:</label>
              <select
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value ? parseInt(e.target.value, 10) : null)}
                style={{
                  padding: '8px 32px 8px 12px',
                  border: '1.5px solid #d0d0d0',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  minWidth: '220px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {companies.filter(c => c.is_active).map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <div className="layout-body">
        {/* Боковая панель навигации */}
        <aside className="sidebar">
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
          <div className="content-body">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Информация о пользователе */}
      <div className="user-info-overlay">
        <span>{user?.username}</span>
        <button onClick={logout} className="logout-btn">
          Выход
        </button>
      </div>
    </div>
  )
}

export default Layout
