import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { referenceService } from '../services/api'
import Select from './ui/Select'

interface CompanySelectFieldProps {
  value: string | number | null
  onChange: (value: string) => void
  required?: boolean
  error?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  fullWidth?: boolean
}

const CompanySelectField: React.FC<CompanySelectFieldProps> = ({
  value,
  onChange,
  required = false,
  error,
  label,
  placeholder = 'Выберите организацию...',
  disabled = false,
  fullWidth = true,
}) => {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadCompanies()
    }
  }, [user])

  const loadCompanies = async () => {
    try {
      const isGlobalAdmin = user?.role === 'ADMIN'
      const hasAdminRoleInCompany = user?.companies?.some((uc: any) => uc.role === 'ADMIN') || false
      
      if (isGlobalAdmin || hasAdminRoleInCompany) {
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      } else if (user?.companies && user.companies.length > 0) {
        const allCompanies = await referenceService.getCompanies()
        const userCompanyIds = user.companies.map((uc: any) => uc.company_id)
        setCompanies(allCompanies.filter((c: any) => 
          c.is_active && userCompanyIds.includes(c.id)
        ))
      } else {
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      }
    } catch (error) {
      console.error('Error loading companies:', error)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const options = companies.map(company => ({
    value: company.id.toString(),
    label: company.name
  }))

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  return (
    <Select
      value={value ? value.toString() : ''}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      error={error}
      label={label}
      required={required}
      disabled={disabled || loading}
      fullWidth={fullWidth}
    />
  )
}

export default CompanySelectField
