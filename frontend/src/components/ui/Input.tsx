import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import './Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      label,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const classes = [
      'ui-input',
      hasError && 'ui-input--error',
      leftIcon && 'ui-input--with-left-icon',
      rightIcon && 'ui-input--with-right-icon',
      !fullWidth && 'ui-input--auto-width',
      className
    ].filter(Boolean).join(' ')

    return (
      <div className={`ui-input-wrapper ${fullWidth ? 'ui-input-wrapper--full-width' : ''} ${!label ? 'ui-input-wrapper--no-label' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="ui-input-label">
            {label}
          </label>
        )}
        <div className="ui-input-container">
          {leftIcon && (
            <span className="ui-input-icon ui-input-icon--left">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={classes}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <span className="ui-input-icon ui-input-icon--right">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <div id={`${inputId}-error`} className="ui-input-error" role="alert">
            {error}
          </div>
        )}
        {!error && hint && (
          <div id={`${inputId}-hint`} className="ui-input-hint">
            {hint}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
