import { useState, useEffect, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface TableColumn<T = any> {
  key: string
  label: string
  sortable?: boolean
  getValue?: (item: T) => any
  compare?: (a: T, b: T, direction: SortDirection) => number
}

export interface UseTableDataOptions<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  searchFields?: string[]
  searchValue?: string
  filterFn?: (item: T) => boolean
  initialSort?: { column: string; direction: SortDirection }
  itemsPerPage?: number
  enablePagination?: boolean
}

export interface UseTableDataReturn<T = any> {
  sortedData: T[]
  paginatedData: T[]
  sortColumn: string | null
  sortDirection: SortDirection
  handleSort: (column: string) => void
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  setCurrentPage: (page: number) => void
  setItemsPerPage: (items: number) => void
  selectedItems: Set<number | string>
  toggleSelect: (id: number | string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  isAllSelected: boolean
  isSomeSelected: boolean
}

export const useTableData = <T extends { id: number | string }>(
  options: UseTableDataOptions<T>
): UseTableDataReturn<T> => {
  const {
    data,
    columns,
    searchFields = [],
    searchValue = '',
    filterFn,
    initialSort,
    itemsPerPage: initialItemsPerPage = 25,
    enablePagination = true,
  } = options

  const [sortColumn, setSortColumn] = useState<string | null>(
    initialSort?.column || null
  )
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSort?.direction || 'asc'
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(
    new Set()
  )

  // Поиск и фильтрация
  const filteredData = useMemo(() => {
    let result = [...data]

    // Текстовый поиск
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase().trim()
      result = result.filter((item) => {
        // Поиск по указанным полям
        if (searchFields.length > 0) {
          return searchFields.some((field) => {
            const value = getNestedValue(item, field)
            return String(value).toLowerCase().includes(query)
          })
        }
        // Поиск по всем строковым полям
        return Object.values(item).some((value) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query)
          }
          if (typeof value === 'number') {
            return String(value).includes(query)
          }
          return false
        })
      })
    }

    // Дополнительная фильтрация
    if (filterFn) {
      result = result.filter(filterFn)
    }

    return result
  }, [data, searchValue, searchFields, filterFn])

  // Сортировка
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData

    const column = columns.find((col) => col.key === sortColumn)
    if (!column || !column.sortable) return filteredData

    return [...filteredData].sort((a, b) => {
      // Используем кастомную функцию сравнения, если есть
      if (column.compare) {
        return column.compare(a, b, sortDirection)
      }

      // Используем getValue, если есть
      if (column.getValue) {
        const aVal = column.getValue(a)
        const bVal = column.getValue(b)
        return compareValues(aVal, bVal, sortDirection)
      }

      // Стандартное сравнение по ключу
      const aVal = getNestedValue(a, sortColumn)
      const bVal = getNestedValue(b, sortColumn)
      return compareValues(aVal, bVal, sortDirection)
    })
  }, [filteredData, sortColumn, sortDirection, columns])

  // Пагинация
  const totalPages = enablePagination
    ? Math.ceil(sortedData.length / itemsPerPage)
    : 1
  const paginatedData = useMemo(() => {
    if (!enablePagination) return sortedData
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, itemsPerPage, enablePagination])

  // Сброс страницы при изменении данных
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  // Обработка сортировки
  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
      setCurrentPage(1) // Сброс на первую страницу при сортировке
    },
    [sortColumn]
  )

  // Выбор элементов
  const toggleSelect = useCallback((id: number | string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === paginatedData.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(paginatedData.map((item) => item.id)))
    }
  }, [selectedItems.size, paginatedData])

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set())
  }, [])

  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedItems.has(item.id))
  const isSomeSelected =
    paginatedData.some((item) => selectedItems.has(item.id)) &&
    !isAllSelected

  return {
    sortedData,
    paginatedData,
    sortColumn,
    sortDirection,
    handleSort,
    currentPage,
    totalPages,
    totalItems: sortedData.length,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    selectedItems,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected,
    isSomeSelected,
  }
}

// Вспомогательные функции
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

function compareValues(a: any, b: any, direction: SortDirection): number {
  // Обработка null/undefined
  if (a == null && b == null) return 0
  if (a == null) return direction === 'asc' ? 1 : -1
  if (b == null) return direction === 'asc' ? -1 : 1

  // Числовое сравнение
  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a
  }

  // Строковое сравнение
  const aStr = String(a).toLowerCase()
  const bStr = String(b).toLowerCase()
  const result = aStr.localeCompare(bStr, 'ru')
  return direction === 'asc' ? result : -result
}

