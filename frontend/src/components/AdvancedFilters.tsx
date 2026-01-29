import { useState } from 'react'
import { Button, Input, Select } from './ui'
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
      <Button
        variant="secondary"
        size="medium"
        className="advanced-filters-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Расширенные фильтры"
      >
        🔍 Фильтры {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
      </Button>

      {isOpen && (
        <>
          <div className="advanced-filters-overlay" onClick={() => setIsOpen(false)} />
          <div className="advanced-filters-panel">
            <div className="advanced-filters-header">
              <h3>Фильтры</h3>
              <Button
                variant="ghost"
                size="small"
                className="advanced-filters-close"
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть"
              >
                ✕
              </Button>
            </div>
            <div className="advanced-filters-body">
              {localFilters.map((filter) => (
                <div key={filter.key} className="advanced-filters-item">
                  {filter.type === 'select' && filter.options ? (
                    <Select
                      label={filter.label}
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      options={[
                        { value: '', label: 'Все' },
                        ...filter.options.map(opt => ({ value: opt.value, label: opt.label }))
                      ]}
                    />
                  ) : filter.type === 'date' ? (
                    <Input
                      type="date"
                      label={filter.label}
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  ) : filter.type === 'number' ? (
                    <Input
                      type="number"
                      label={filter.label}
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  ) : (
                    <Input
                      type="text"
                      label={filter.label}
                      value={filter.value || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      placeholder={`Введите ${filter.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="advanced-filters-footer">
              <Button variant="secondary" size="medium" onClick={handleReset}>
                Сбросить
              </Button>
              <Button variant="primary" size="medium" onClick={handleApply}>
                Применить
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdvancedFilters

