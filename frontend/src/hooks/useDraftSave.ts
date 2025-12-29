import { useState, useEffect, useCallback } from 'react'

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

  // Загрузка черновика при монтировании
  useEffect(() => {
    if (!enabled) return
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && Object.keys(parsed).length > 0) {
          setHasDraft(true)
        }
      } catch (e) {
        console.error('Error parsing draft:', e)
      }
    }
  }, [key, enabled])

  // Автосохранение при изменении данных
  useEffect(() => {
    if (!enabled) return
    
    // Проверяем, есть ли данные для сохранения
    const hasData = data && typeof data === 'object' && Object.keys(data).length > 0
    
    if (hasData) {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        setHasDraft(true)
      } catch (e) {
        console.error('Error saving draft:', e)
      }
    }
  }, [key, data, enabled])

  // Загрузка черновика
  const loadDraft = useCallback((): T | null => {
    if (!enabled) return null
    try {
      const saved = localStorage.getItem(key)
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
      localStorage.removeItem(key)
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

