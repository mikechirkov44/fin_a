import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react'
import './Select.css'

interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      error,
      label,
      hint,
      options,
      placeholder,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const classes = [
      'ui-select',
      hasError && 'ui-select--error',
      !fullWidth && 'ui-select--auto-width',
      className
    ].filter(Boolean).join(' ')

    return (
      <div className={`ui-select-wrapper ${fullWidth ? 'ui-select-wrapper--full-width' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="ui-select-label">
            {label}
          </label>
        )}
        <div className="ui-select-container">
          <select
            ref={ref}
            id={selectId}
            className={classes}
            aria-invalid={hasError}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <span className="ui-select-arrow" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L1 4H11L6 9Z" fill="currentColor"/>
            </svg>
          </span>
        </div>
        {error && (
          <div id={`${selectId}-error`} className="ui-select-error" role="alert">
            {error}
          </div>
        )}
        {!error && hint && (
          <div id={`${selectId}-hint`} className="ui-select-hint">
            {hint}
          </div>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
