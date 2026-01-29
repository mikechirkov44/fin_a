import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { referenceService } from '../services/api'
import Modal from './Modal'
import { HiOutlineBuildingOffice, HiOutlineCheck } from 'react-icons/hi2'
import { Button, SearchInput } from './ui'
import './CompanySelector.css'

interface Company {
  id: number
  name: string
  description?: string
}

const CompanySelector: React.FC = () => {
  const { user, selectedCompanyId, setSelectedCompany, companies: authCompanies } = useAuth()
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (user) {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      // Проверяем глобальную роль ADMIN
      const isGlobalAdmin = user?.role === 'ADMIN'
      
      // Проверяем, есть ли у пользователя роль ADMIN в какой-либо организации
      const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false
      
      if (isGlobalAdmin || hasAdminRoleInCompany) {
        // Администратор (глобальный или в организации) видит все организации
        const allCompanies = await referenceService.getCompanies()
        const activeCompanies = allCompanies.filter((c: any) => c.is_active)
        setCompanies(activeCompanies)
      } else if (user?.companies && user.companies.length > 0) {
        // Обычный пользователь видит только свои организации
        const allCompanies = await referenceService.getCompanies()
        const userCompanyIds = user.companies.map((uc: any) => uc.company_id)
        const filteredCompanies = allCompanies.filter((c: any) => 
          c.is_active && userCompanyIds.includes(c.id)
        )
        setCompanies(filteredCompanies)
      } else {
        // Если у пользователя нет связей с организациями, загружаем все активные
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      }
    } catch (error) {
      console.error('Error loading companies:', error)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  // Вычисляем переменные до ранних return
  const isGlobalAdmin = user?.role === 'ADMIN'
  const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false

  // Используем те же переменные для фильтрации
  const filteredCompanies = React.useMemo(() => {
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [companies, searchQuery])

  // Формируем список всех элементов для навигации с клавиатуры
  const allItems = React.useMemo(() => {
    const items: Array<{ id: number | null; type: 'all' | 'company' }> = []
    if (isGlobalAdmin || hasAdminRoleInCompany) {
      items.push({ id: null, type: 'all' })
    }
    filteredCompanies.forEach(company => {
      items.push({ id: company.id, type: 'company' })
    })
    return items
  }, [isGlobalAdmin, hasAdminRoleInCompany, filteredCompanies])

  const handleSelectCompany = (companyId: number | null) => {
    setSelectedCompany(companyId)
    setIsModalOpen(false)
    setSearchQuery('')
    setSelectedIndex(-1)
  }

  const getSelectedCompanyName = () => {
    if (selectedCompanyId === null || selectedCompanyId === undefined) {
      return 'Все организации'
    }
    const company = companies.find(c => c.id === selectedCompanyId)
    return company?.name || 'Не выбрано'
  }

  // Обработка навигации с клавиатуры
  useEffect(() => {
    if (!isModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => {
          const next = prev < allItems.length - 1 ? prev + 1 : 0
          if (listRef.current) {
            const items = listRef.current.querySelectorAll('.company-selector-item')
            if (items[next]) {
              items[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : allItems.length - 1
          if (listRef.current) {
            const items = listRef.current.querySelectorAll('.company-selector-item')
            if (items[next]) {
              items[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }
          return next
        })
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < allItems.length) {
        e.preventDefault()
        const item = allItems[selectedIndex]
        setSelectedCompany(item.id)
        setIsModalOpen(false)
        setSearchQuery('')
        setSelectedIndex(-1)
      } else if (e.key === 'Escape') {
        setIsModalOpen(false)
        setSearchQuery('')
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen, selectedIndex, allItems, setSelectedCompany])

  // Блокировка прокрутки фона и фокус на поле поиска при открытии модального окна
  useEffect(() => {
    if (isModalOpen) {
      // Блокируем прокрутку фона
      document.body.style.overflow = 'hidden'
      
      // Фокус на поле поиска
      if (searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 100)
      }
      
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isModalOpen])

  // Сброс выбранного индекса при изменении поискового запроса
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchQuery])

  const handleClearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSearchQuery('')
    setSelectedIndex(-1)
  }

  // Ранние return после всех хуков
  if (loading || !user) return null

  // Если у пользователя только одна организация и он не администратор, не показываем селектор
  if (companies.length <= 1 && !isGlobalAdmin && !hasAdminRoleInCompany) return null

  return (
    <>
      <div className="company-selector">
        <Button
          variant="secondary"
          onClick={() => setIsModalOpen(true)}
          className="company-selector-button"
          aria-label="Выбрать организацию"
          fullWidth
        >
          <div className="company-selector-button-content">
            <HiOutlineBuildingOffice className="company-selector-icon" />
            <div className="company-selector-button-text">
              <span className="company-selector-label">Организация</span>
              <span className="company-selector-value">{getSelectedCompanyName()}</span>
            </div>
          </div>
          <span className="company-selector-arrow">▼</span>
        </Button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Выбор организации"
        maxWidth="420px"
      >
        <div className="company-selector-modal">
          <div className="company-selector-search">
            <SearchInput
              ref={searchInputRef}
              placeholder="Поиск организации..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedIndex(-1)
              }}
              onClear={handleClearSearch}
              className="company-selector-search-input"
              autoFocus
              fullWidth
            />
          </div>

          <div className="company-selector-list" ref={listRef}>
            {(isGlobalAdmin || hasAdminRoleInCompany) && (
              <div
                className={`company-selector-item ${selectedCompanyId === null ? 'selected' : ''} ${selectedIndex === 0 ? 'keyboard-selected' : ''}`}
                onClick={() => handleSelectCompany(null)}
                onMouseEnter={() => setSelectedIndex(0)}
              >
                <div className="company-selector-item-content">
                  <div className="company-selector-item-icon-wrapper">
                    <HiOutlineBuildingOffice className="company-selector-item-icon" />
                  </div>
                  <div className="company-selector-item-info">
                    <div className="company-selector-item-name">Все организации</div>
                    <div className="company-selector-item-description">Показать данные по всем организациям</div>
                  </div>
                </div>
                {selectedCompanyId === null && (
                  <div className="company-selector-item-check-wrapper">
                    <HiOutlineCheck className="company-selector-item-check" />
                  </div>
                )}
              </div>
            )}

            {filteredCompanies.length === 0 ? (
              <div className="company-selector-empty">
                <div className="company-selector-empty-icon">🔍</div>
                <div className="company-selector-empty-text">
                  {searchQuery ? 'Организации не найдены' : 'Нет доступных организаций'}
                </div>
                {searchQuery && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleClearSearch}
                    className="company-selector-empty-clear"
                  >
                    Очистить поиск
                  </Button>
                )}
              </div>
            ) : (
              filteredCompanies.map((company, index) => {
                const itemIndex = (isGlobalAdmin || hasAdminRoleInCompany) ? index + 1 : index
                return (
                  <div
                    key={company.id}
                    className={`company-selector-item ${selectedCompanyId === company.id ? 'selected' : ''} ${selectedIndex === itemIndex ? 'keyboard-selected' : ''}`}
                    onClick={() => handleSelectCompany(company.id)}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                  >
                    <div className="company-selector-item-content">
                      <div className="company-selector-item-icon-wrapper">
                        <HiOutlineBuildingOffice className="company-selector-item-icon" />
                      </div>
                      <div className="company-selector-item-info">
                        <div className="company-selector-item-name">{company.name}</div>
                        {company.description && (
                          <div className="company-selector-item-description">{company.description}</div>
                        )}
                      </div>
                    </div>
                    {selectedCompanyId === company.id && (
                      <div className="company-selector-item-check-wrapper">
                        <HiOutlineCheck className="company-selector-item-check" />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {allItems.length > 0 && (
            <div className="company-selector-hint">
              <span className="company-selector-hint-icon">⌨️</span>
              <span>Используйте ↑↓ для навигации, Enter для выбора, Esc для закрытия</span>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default CompanySelector
