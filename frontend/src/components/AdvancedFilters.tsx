import { useState } from 'react'
import './AdvancedFilters.css'

interface FilterOption {
  label: string
  value: string
}

interface Filter {
  key: string
  label: string
  type: 'select' | 'text' | 'date' | 'number'
  options?: FilterOption[]
  value: any
}

interface AdvancedFiltersProps {
  filters: Filter[]
  onFilterChange: (filters: Filter[]) => void
  onReset: () => void
}

const AdvancedFilters = ({ filters, onFilterChange, onReset }: AdvancedFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<Filter[]>(filters)

  const handleFilterChange = (key: string, value: any) => {
    const updated = localFilters.map((f) => (f.key === key ? { ...f, value } : f))
    setLocalFilters(updated)
  }

  const handleApply = () => {
    onFilterChange(localFilters)
    setIsOpen(false)
  }

  const handleReset = () => {
    const reset = localFilters.map((f) => ({ ...f, value: '' }))
    setLocalFilters(reset)
    onFilterChange(reset)
    onReset()
    setIsOpen(false)
  }

  const activeFiltersCount = filters.filter((f) => f.value !== '' && f.value !== null).length

  return (
    <div className="advanced-filters">
      <button
        className="advanced-filters-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Расширенные фильтры"
      >
        🔍 Фильтры {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
      </button>

      {isOpen && (
        <>
          <div className="advanced-filters-overlay" onClick={() => setIsOpen(false)} />
          <div className="advanced-filters-panel">
            <div className="advanced-filters-header">
              <h3>Фильтры</h3>
              <button className="advanced-filters-close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
            <div className="advanced-filters-body">
              {localFilters.map((filter) => (
                <div key={filter.key} className="advanced-filters-item">
                  <label>{filter.label}</label>
                  {filter.type === 'select' && filter.options ? (
                    <select
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    >
                      <option value="">Все</option>
                      {filter.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : filter.type === 'date' ? (
                    <input
                      type="date"
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  ) : filter.type === 'number' ? (
                    <input
                      type="number"
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      placeholder={`Введите ${filter.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="advanced-filters-footer">
              <button className="advanced-filters-button" onClick={handleReset}>
                Сбросить
              </button>
              <button className="advanced-filters-button primary" onClick={handleApply}>
                Применить
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdvancedFilters

