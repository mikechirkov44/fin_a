import { ReactNode } from 'react'
import './FormField.css'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  hint?: string
}

const FormField = ({ label, required, error, children, hint }: FormFieldProps) => {
  return (
    <div className={`form-field ${error ? 'form-field-error' : ''}`}>
      <label className="form-field-label">
        {label}
        {required && <span className="form-field-required">*</span>}
      </label>
      <div className="form-field-input-wrapper">
        {children}
        {error && <div className="form-field-error-message">{error}</div>}
        {hint && !error && <div className="form-field-hint">{hint}</div>}
      </div>
    </div>
  )
}

export default FormField

