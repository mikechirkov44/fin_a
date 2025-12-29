import { useState, useCallback } from 'react'

interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

interface ValidationRules {
  [key: string]: ValidationRule
}

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(
    (data: Record<string, any>): boolean => {
      const newErrors: Record<string, string> = {}

      Object.keys(rules).forEach((key) => {
        const rule = rules[key]
        const value = data[key]

        if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
          newErrors[key] = 'Это поле обязательно для заполнения'
          return
        }

        if (value && rule.min !== undefined) {
          if (typeof value === 'number' && value < rule.min) {
            newErrors[key] = `Значение должно быть не менее ${rule.min}`
            return
          }
          if (typeof value === 'string' && value.length < rule.min) {
            newErrors[key] = `Минимальная длина: ${rule.min} символов`
            return
          }
        }

        if (value && rule.max !== undefined) {
          if (typeof value === 'number' && value > rule.max) {
            newErrors[key] = `Значение должно быть не более ${rule.max}`
            return
          }
          if (typeof value === 'string' && value.length > rule.max) {
            newErrors[key] = `Максимальная длина: ${rule.max} символов`
            return
          }
        }

        if (value && rule.pattern && !rule.pattern.test(String(value))) {
          newErrors[key] = 'Неверный формат'
          return
        }

        if (value && rule.custom) {
          const customError = rule.custom(value)
          if (customError) {
            newErrors[key] = customError
            return
          }
        }
      })

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [rules]
  )

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[key]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validate,
    clearError,
    clearAllErrors,
  }
}

