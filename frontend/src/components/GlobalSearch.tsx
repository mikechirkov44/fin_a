import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import './GlobalSearch.css'

interface SearchResult {
  type: string
  id: number
  title: string
  subtitle?: string
  path: string
  icon: string
}

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Открытие поиска по Ctrl+K
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => {
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      },
      description: 'Открыть глобальный поиск'
    },
    {
      key: 'Escape',
      action: () => {
        if (isOpen) {
          setIsOpen(false)
          setQuery('')
          setResults([])
        }
      }
    }
  ])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        // Импортируем сервисы динамически чтобы избежать циклических зависимостей
        const { suppliersService, customersService, productsService, realizationService } = await import('../services/api')
        
        const searchLower = query.toLowerCase()
        const allResults: SearchResult[] = []

        // Поиск поставщиков
        try {
          const suppliers = await suppliersService.getSuppliers({ search: query, limit: 5 })
          suppliers.forEach((s: any) => {
            allResults.push({
              type: 'supplier',
              id: s.id,
              title: s.name,
              subtitle: s.contact_person || s.phone || '',
              path: '/suppliers',
              icon: '🚚'
            })
          })
        } catch (e) {}

        // Поиск клиентов
        try {
          const customers = await customersService.getCustomers({ search: query, limit: 5 })
          customers.forEach((c: any) => {
            allResults.push({
              type: 'customer',
              id: c.id,
              title: c.name,
              subtitle: c.phone || c.email || '',
              path: '/customers',
              icon: '👥'
            })
          })
        } catch (e) {}

        // Поиск товаров
        try {
          const products = await productsService.getProducts({ limit: 100 })
          const filtered = products.filter((p: any) => 
            p.name?.toLowerCase().includes(searchLower) || 
            p.sku?.toLowerCase().includes(searchLower)
          ).slice(0, 5)
          filtered.forEach((p: any) => {
            allResults.push({
              type: 'product',
              id: p.id,
              title: p.name,
              subtitle: `SKU: ${p.sku}`,
              path: '/products',
              icon: '📦'
            })
          })
        } catch (e) {}

        // Поиск реализаций (по дате или маркетплейсу)
        try {
          const realizations = await realizationService.getRealizations({ limit: 100 })
          const filtered = realizations.filter((r: any) => 
            r.date?.includes(searchLower) ||
            r.sales_channel_name?.toLowerCase().includes(searchLower)
          ).slice(0, 5)
          filtered.forEach((r: any) => {
            allResults.push({
              type: 'realization',
              id: r.id,
              title: `Реализация от ${r.date}`,
              subtitle: r.sales_channel_name || '',
              path: '/realization',
              icon: '🏷️'
            })
          })
        } catch (e) {}

        setResults(allResults)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(search, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && results.length > 0) {
          e.preventDefault()
          handleSelect(results[selectedIndex])
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, results, selectedIndex])

  const handleSelect = (result: SearchResult) => {
    navigate(result.path)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="global-search-trigger"
        title="Поиск (Ctrl+K)"
      >
        <span>🔍</span>
        <span className="global-search-trigger-text">Поиск...</span>
        <kbd>Ctrl+K</kbd>
      </button>
    )
  }

  return (
    <div className="global-search-overlay" onClick={() => setIsOpen(false)}>
      <div className="global-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="global-search-input-wrapper">
          <span className="global-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Поиск по всем модулям..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            className="global-search-input"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              className="global-search-clear"
            >
              ✕
            </button>
          )}
        </div>

        {loading && (
          <div className="global-search-loading">Поиск...</div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="global-search-empty">Ничего не найдено</div>
        )}

        {results.length > 0 && (
          <div className="global-search-results">
            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                className={`global-search-result ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="global-search-result-icon">{result.icon}</span>
                <div className="global-search-result-content">
                  <div className="global-search-result-title">{result.title}</div>
                  {result.subtitle && (
                    <div className="global-search-result-subtitle">{result.subtitle}</div>
                  )}
                </div>
                <span className="global-search-result-type">{result.type}</span>
              </div>
            ))}
          </div>
        )}

        {query.length < 2 && (
          <div className="global-search-hint">
            Введите минимум 2 символа для поиска
          </div>
        )}
      </div>
    </div>
  )
}

export default GlobalSearch

