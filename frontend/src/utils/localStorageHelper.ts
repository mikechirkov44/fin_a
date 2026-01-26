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
 * Безопасное сохранение в localStorage с обработкой ошибок переполнения
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
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
              localStorage.clear()
              if (token) {
                localStorage.setItem('token', token)
              }
              localStorage.setItem(key, value)
              console.log('Successfully saved after full cleanup')
              return true
            } catch (e4) {
              console.error('Failed to save even after full cleanup:', e4)
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
          const size = value.length
          totalSize += size
          items.push({ key, size })
        }
      }
    }
    
    // Если общий размер превышает 4MB (80% от типичного лимита 5MB), очищаем черновики
    if (totalSize > 4 * 1024 * 1024) {
      console.warn(`LocalStorage size (${(totalSize / 1024 / 1024).toFixed(2)}MB) is high, clearing drafts`)
      clearAllDrafts()
    }
  } catch (e) {
    console.error('Error checking localStorage size:', e)
  }
}
