/**
 * Утилита для безопасной работы с localStorage
 * Обрабатывает ошибки переполнения и автоматически очищает старые данные
 */

// Список ключей черновиков, которые можно безопасно удалить
const DRAFT_KEYS = [
  'input1-draft',
  'input2-draft',
  'realization-draft',
  'shipment-draft',
  'bank-cash-draft',
  'customers-draft',
  'suppliers-draft',
  'products-draft',
]

// Критически важные ключи, которые нельзя удалять
const CRITICAL_KEYS = ['token', 'selectedCompanyId']

/**
 * Очищает все черновики из localStorage
 */
export const clearAllDrafts = (): void => {
  try {
    DRAFT_KEYS.forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('All drafts cleared')
  } catch (e) {
    console.error('Error clearing drafts:', e)
  }
}

/**
 * Очищает все данные из localStorage кроме критически важных
 */
export const clearNonCriticalData = (): void => {
  try {
    const keysToRemove: string[] = []
    
    // Собираем все ключи кроме критических
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !CRITICAL_KEYS.includes(key)) {
        keysToRemove.push(key)
      }
    }
    
    // Удаляем все некритические ключи
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    console.log(`Cleared ${keysToRemove.length} non-critical items from localStorage`)
  } catch (e) {
    console.error('Error clearing non-critical data:', e)
  }
}

/**
 * Проверяет размер значения перед сохранением
 */
const checkValueSize = (value: string, maxSize: number = 50 * 1024): boolean => {
  const size = new Blob([value]).size
  if (size > maxSize) {
    console.warn(`Value size (${(size / 1024).toFixed(2)}KB) exceeds limit (${(maxSize / 1024).toFixed(2)}KB)`)
    return false
  }
  return true
}

/**
 * Безопасное сохранение в localStorage с обработкой ошибок переполнения
 */
export const safeSetItem = (key: string, value: string, maxSize?: number): boolean => {
  // Проверяем размер перед сохранением (для некритических ключей)
  if (maxSize && !CRITICAL_KEYS.includes(key)) {
    if (!checkValueSize(value, maxSize)) {
      // Если значение слишком большое, очищаем старые черновики и пробуем снова
      clearAllDrafts()
      if (!checkValueSize(value, maxSize)) {
        console.warn('Value too large even after cleanup, skipping save')
        return false
      }
    }
  }

  try {
    localStorage.setItem(key, value)
    return true
  } catch (e: any) {
    // Обрабатываем различные варианты ошибок квоты
    const isQuotaError = 
      e.name === 'QuotaExceededError' || 
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.message?.includes('quota') ||
      e.message?.includes('QuotaExceeded') ||
      e.code === 22 ||
      (e.code === 1014 && e.name === 'NS_ERROR_DOM_QUOTA_REACHED') ||
      e.toString().includes('QuotaExceeded')

    if (isQuotaError) {
      console.warn('LocalStorage quota exceeded, attempting cleanup...')
      
      // Сначала пытаемся очистить только черновики
      clearAllDrafts()
      
      try {
        localStorage.setItem(key, value)
        console.log('Successfully saved after clearing drafts')
        return true
      } catch (e2: any) {
        // Если не помогло, очищаем все некритические данные
        console.warn('Clearing all non-critical data...')
        clearNonCriticalData()
        
        try {
          localStorage.setItem(key, value)
          console.log('Successfully saved after clearing non-critical data')
          return true
        } catch (e3) {
          console.error('Failed to save after cleanup:', e3)
          // В последней попытке удаляем все кроме токена
          if (key !== 'token') {
            try {
              const token = localStorage.getItem('token')
              const selectedCompanyId = localStorage.getItem('selectedCompanyId')
              localStorage.clear()
              if (token) {
                localStorage.setItem('token', token)
              }
              if (selectedCompanyId) {
                localStorage.setItem('selectedCompanyId', selectedCompanyId)
              }
              localStorage.setItem(key, value)
              console.log('Successfully saved after full cleanup')
              return true
            } catch (e4) {
              console.error('Failed to save even after full cleanup:', e4)
              // Если даже после полной очистки не получается, возможно значение слишком большое
              if (maxSize && value.length > maxSize) {
                console.warn('Value is too large to save, even after cleanup')
              }
            }
          }
          return false
        }
      }
    } else {
      console.error('Error saving to localStorage:', e)
      return false
    }
  }
}

/**
 * Безопасное получение из localStorage
 */
export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.error('Error reading from localStorage:', e)
    return null
  }
}

/**
 * Безопасное удаление из localStorage
 */
export const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Error removing from localStorage:', e)
  }
}

/**
 * Проверяет размер localStorage и очищает при необходимости
 */
export const checkAndCleanStorage = (): void => {
  try {
    let totalSize = 0
    const items: Array<{ key: string; size: number }> = []
    
    // Собираем информацию о всех элементах
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          const size = new Blob([value]).size
          totalSize += size
          items.push({ key, size })
        }
      }
    }
    
    // Если общий размер превышает 3MB (60% от типичного лимита 5MB), очищаем черновики
    if (totalSize > 3 * 1024 * 1024) {
      console.warn(`LocalStorage size (${(totalSize / 1024 / 1024).toFixed(2)}MB) is high, clearing drafts`)
      clearAllDrafts()
    }
    
    // Также проверяем размер отдельных элементов - если какой-то черновик слишком большой, удаляем его
    items.forEach(({ key, size }) => {
      if (DRAFT_KEYS.includes(key) && size > 50 * 1024) {
        console.warn(`Draft ${key} is too large (${(size / 1024).toFixed(2)}KB), removing it`)
        safeRemoveItem(key)
      }
    })
  } catch (e) {
    console.error('Error checking localStorage size:', e)
  }
}
