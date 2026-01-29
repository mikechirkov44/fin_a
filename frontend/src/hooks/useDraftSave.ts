import { useState, useEffect, useCallback, useRef } from 'react'
import { safeSetItem, safeGetItem, safeRemoveItem, clearAllDrafts } from '../utils/localStorageHelper'

// Максимальный размер черновика (50KB вместо 100KB)
const MAX_DRAFT_SIZE = 50 * 1024

/**
 * Ограничивает размер данных для черновика
 * Для массивов ограничивает количество элементов
 */
const limitDraftSize = <T>(data: T): T => {
  if (!data || typeof data !== 'object') {
    return data
  }

  const dataCopy = JSON.parse(JSON.stringify(data)) as any

  // Если есть массив items (например, товары в реализации), ограничиваем его
  if (dataCopy.items && Array.isArray(dataCopy.items)) {
    // Оставляем только последние 50 элементов
    if (dataCopy.items.length > 50) {
      console.warn(`Draft has ${dataCopy.items.length} items, limiting to 50`)
      dataCopy.items = dataCopy.items.slice(-50)
    }
  }

  return dataCopy as T
}

/**
 * Хук для автосохранения черновиков в localStorage
 * @param key - уникальный ключ для сохранения (например, 'realization-draft')
 * @param data - данные для сохранения
 * @param enabled - включить/выключить автосохранение
 */
export const useDraftSave = <T>(
  key: string,
  data: T,
  enabled: boolean = true
) => {
  const [hasDraft, setHasDraft] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Функция для очистки старых черновиков
  const clearOldDrafts = useCallback(() => {
    try {
      const draftKeys = ['input1-draft', 'input2-draft', 'realization-draft', 'shipment-draft', 
                         'bank-cash-draft', 'customers-draft', 'suppliers-draft', 'products-draft']
      // Очищаем все черновики кроме текущего
      draftKeys.forEach(draftKey => {
        if (draftKey !== key) {
          safeRemoveItem(draftKey)
        }
      })
    } catch (e) {
      console.error('Error clearing old drafts:', e)
    }
  }, [key])

  // Загрузка черновика при монтировании
  useEffect(() => {
    if (!enabled) return
    
    // Проверяем размер localStorage и очищаем старые черновики при необходимости
    try {
      let totalSize = 0
      const draftKeys = ['input1-draft', 'input2-draft', 'realization-draft', 'shipment-draft', 
                         'bank-cash-draft', 'customers-draft', 'suppliers-draft', 'products-draft']
      
      draftKeys.forEach(draftKey => {
        const item = safeGetItem(draftKey)
        if (item) {
          totalSize += new Blob([item]).size
        }
      })
      
      // Если общий размер черновиков превышает 200KB, очищаем все кроме текущего
      if (totalSize > 200 * 1024) {
        console.warn(`Drafts size exceeded 200KB (${(totalSize / 1024).toFixed(2)}KB), clearing old drafts`)
        clearOldDrafts()
      }
    } catch (e) {
      console.error('Error checking localStorage size:', e)
    }
    
    const saved = safeGetItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && Object.keys(parsed).length > 0) {
          setHasDraft(true)
        }
      } catch (e) {
        console.error('Error parsing draft:', e)
        // Если черновик поврежден, удаляем его
        safeRemoveItem(key)
      }
    }
  }, [key, enabled, clearOldDrafts])

  // Автосохранение при изменении данных с debounce
  useEffect(() => {
    if (!enabled) return
    
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Проверяем, есть ли данные для сохранения
    const hasData = data && typeof data === 'object' && Object.keys(data).length > 0
    
    if (hasData) {
      // Используем debounce - сохраняем через 1 секунду после последнего изменения
      saveTimeoutRef.current = setTimeout(() => {
        try {
          // Ограничиваем размер данных перед сохранением
          const limitedData = limitDraftSize(data)
          const dataString = JSON.stringify(limitedData)
          
          // Проверяем размер данных
          const dataSize = new Blob([dataString]).size
          if (dataSize > MAX_DRAFT_SIZE) {
            console.warn(`Draft data too large (${(dataSize / 1024).toFixed(2)}KB), skipping save`)
            return
          }
          
          // Сохраняем с ограничением размера
          const success = safeSetItem(key, dataString, MAX_DRAFT_SIZE)
          if (success) {
            setHasDraft(true)
          } else {
            console.warn('Failed to save draft, storage may be full')
          }
        } catch (e: any) {
          console.error('Error saving draft:', e)
        }
      }, 1000) // Debounce 1 секунда
    }

    // Очистка таймера при размонтировании
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [key, data, enabled])

  // Загрузка черновика
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null
    try {
      const saved = safeGetItem(key)
      if (saved) {
        return JSON.parse(saved) as T
      }
    } catch (e) {
      console.error('Error loading draft:', e)
    }
    return null
  }, [key, enabled])

  // Очистка черновика
  const clearDraft = useCallback(() => {
    if (!enabled) return
    try {
      safeRemoveItem(key)
      setHasDraft(false)
    } catch (e) {
      console.error('Error clearing draft:', e)
    }
  }, [key, enabled])

  return {
    hasDraft,
    loadDraft,
    clearDraft,
  }
}

