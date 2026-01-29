import { InputHTMLAttributes, ReactNode, forwardRef, useState } from 'react'
import { HiOutlineMagnifyingGlass, HiOutlineXMark } from 'react-icons/hi2'
import Input from './Input'
import './SearchInput.css'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
  showClearButton?: boolean
  fullWidth?: boolean
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onClear,
      showClearButton = true,
      fullWidth = false,
      className = '',
      onChange,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || '')
    const currentValue = value !== undefined ? value : internalValue
    const hasValue = String(currentValue).length > 0

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    const handleClear = () => {
      const syntheticEvent = {
        target: { value: '' },
        currentTarget: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>
      
      if (value === undefined) {
        setInternalValue('')
      }
      onChange?.(syntheticEvent)
      onClear?.()
    }

    return (
      <div className={`ui-search-input ${fullWidth ? 'ui-search-input--full-width' : ''}`}>
        <Input
          ref={ref}
          type="search"
          value={currentValue}
          onChange={handleChange}
          leftIcon={<HiOutlineMagnifyingGlass />}
          rightIcon={
            showClearButton && hasValue ? (
              <button
                type="button"
                className="ui-search-input__clear"
                onClick={handleClear}
                aria-label="Очистить поиск"
              >
                <HiOutlineXMark />
              </button>
            ) : undefined
          }
          fullWidth={fullWidth}
          className={`ui-search-input__input ${className}`}
          placeholder={props.placeholder || 'Поиск...'}
          {...props}
        />
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'

export default SearchInput
