import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { referenceService } from '../services/api'
import Modal from './Modal'
import { HiOutlineBuildingOffice, HiOutlineCheck, HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2'
import './CompanySelector.css'

interface CompanySelectFieldProps {
  value: string | number | null
  onChange: (value: string) => void
  required?: boolean
  error?: string
  label?: string
  placeholder?: string
}

const CompanySelectField: React.FC<CompanySelectFieldProps> = ({
  value,
  onChange,
  required = false,
  error,
  label,
  placeholder = 'Выберите организацию...',
}) => {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      const isGlobalAdmin = user?.role === 'ADMIN'
      const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false
      
      if (isGlobalAdmin || hasAdminRoleInCompany) {
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      } else if (user?.companies && user.companies.length > 0) {
        const allCompanies = await referenceService.getCompanies()
        const userCompanyIds = user.companies.map((uc: any) => uc.company_id)
        setCompanies(allCompanies.filter((c: any) => 
          c.is_active && userCompanyIds.includes(c.id)
        ))
      } else {
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

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectCompany = (companyId: number | null) => {
    onChange(companyId ? companyId.toString() : '')
    setIsModalOpen(false)
    setSearchQuery('')
    setSelectedIndex(-1)
  }

  const getSelectedCompanyName = () => {
    if (!value || value === '') {
      return placeholder
    }
    const company = companies.find(c => c.id === parseInt(String(value)))
    return company?.name || placeholder
  }

  const isSelected = (companyId: number | null) => {
    if (!value || value === '') return companyId === null
    return parseInt(String(value)) === companyId
  }

  // Обработка навигации с клавиатуры
  useEffect(() => {
    if (!isModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => {
          const next = prev < filteredCompanies.length - 1 ? prev + 1 : 0
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
          const next = prev > 0 ? prev - 1 : filteredCompanies.length - 1
          if (listRef.current) {
            const items = listRef.current.querySelectorAll('.company-selector-item')
            if (items[next]) {
              items[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }
          return next
        })
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < filteredCompanies.length) {
        e.preventDefault()
        const company = filteredCompanies[selectedIndex]
        handleSelectCompany(company.id)
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
  }, [isModalOpen, selectedIndex, filteredCompanies])

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
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

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="company-select-field-button"
          style={{
            width: '100%',
            padding: '10px 14px',
            border: `1.5px solid ${error ? 'var(--danger-color)' : 'var(--input-border)'}`,
            borderRadius: '8px',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            height: '40px',
            minHeight: '40px',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color-strong)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--danger-color)' : 'var(--input-border)'
          }}
        >
          <span style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap',
            flex: 1,
            color: value ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}>
            {getSelectedCompanyName()}
          </span>
          <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>▼</span>
        </button>
        {error && (
          <div style={{ 
            color: 'var(--danger-color)', 
            fontSize: '12px', 
            marginTop: '4px' 
          }}>
            {error}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Выбор организации"
        maxWidth="560px"
      >
        <div className="company-selector-modal">
          <div className="company-selector-search">
            <div className="company-selector-search-wrapper">
              <HiOutlineMagnifyingGlass className="company-selector-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Поиск организации..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedIndex(-1)
                }}
                className="company-selector-search-input"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="company-selector-search-clear"
                  aria-label="Очистить поиск"
                >
                  <HiOutlineXMark />
                </button>
              )}
            </div>
          </div>

          <div className="company-selector-list" ref={listRef}>
            {filteredCompanies.length === 0 ? (
              <div className="company-selector-empty">
                <div className="company-selector-empty-icon">🔍</div>
                <div className="company-selector-empty-text">
                  {searchQuery ? 'Организации не найдены' : 'Нет доступных организаций'}
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="company-selector-empty-clear"
                  >
                    Очистить поиск
                  </button>
                )}
              </div>
            ) : (
              filteredCompanies.map((company, index) => (
                <div
                  key={company.id}
                  className={`company-selector-item ${isSelected(company.id) ? 'selected' : ''} ${selectedIndex === index ? 'keyboard-selected' : ''}`}
                  onClick={() => handleSelectCompany(company.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
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
                  {isSelected(company.id) && (
                    <div className="company-selector-item-check-wrapper">
                      <HiOutlineCheck className="company-selector-item-check" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {filteredCompanies.length > 0 && (
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

export default CompanySelectField
