import { useState, useEffect, useCallback } from 'react'
import { safeSetItem, safeGetItem, safeRemoveItem, clearAllDrafts } from '../utils/localStorageHelper'

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
          totalSize += item.length
        }
      })
      
      // Если общий размер черновиков превышает 500KB, очищаем все кроме текущего
      if (totalSize > 500 * 1024) {
        console.warn('Drafts size exceeded 500KB, clearing old drafts')
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

  // Автосохранение при изменении данных
  useEffect(() => {
    if (!enabled) return
    
    // Проверяем, есть ли данные для сохранения
    const hasData = data && typeof data === 'object' && Object.keys(data).length > 0
    
    if (hasData) {
      try {
        const dataString = JSON.stringify(data)
        // Проверяем размер данных (localStorage ограничен ~5-10MB, но лучше ограничить черновики до 100KB)
        if (dataString.length > 100 * 1024) {
          console.warn('Draft data too large, skipping save')
          return
        }
        const success = safeSetItem(key, dataString)
        if (success) {
          setHasDraft(true)
        }
      } catch (e: any) {
        console.error('Error saving draft:', e)
      }
    }
  }, [key, data, enabled, clearOldDrafts])

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

