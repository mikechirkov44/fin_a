import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { referenceService } from '../services/api'

interface Company {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

interface CompanyContextType {
  selectedCompanyId: number | null
  setSelectedCompanyId: (id: number | null) => void
  companies: Company[]
  loadCompanies: () => Promise<void>
  selectedCompany: Company | null
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export const useCompany = () => {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider')
  }
  return context
}

interface CompanyProviderProps {
  children: ReactNode
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<number | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const loadCompanies = async () => {
    try {
      const data = await referenceService.getCompanies()
      setCompanies(data)
      
      // Если компания не выбрана, выбираем первую активную
      if (!selectedCompanyId && data.length > 0) {
        const activeCompany = data.find(c => c.is_active)
        if (activeCompany) {
          setSelectedCompanyIdState(activeCompany.id)
          localStorage.setItem('selectedCompanyId', activeCompany.id.toString())
        }
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  const setSelectedCompanyId = (id: number | null) => {
    setSelectedCompanyIdState(id)
    if (id) {
      localStorage.setItem('selectedCompanyId', id.toString())
    } else {
      localStorage.removeItem('selectedCompanyId')
    }
  }

  useEffect(() => {
    // Загружаем компании при монтировании
    loadCompanies()
    
    // Восстанавливаем выбранную компанию из localStorage
    const savedCompanyId = localStorage.getItem('selectedCompanyId')
    if (savedCompanyId) {
      const id = parseInt(savedCompanyId, 10)
      if (!isNaN(id)) {
        setSelectedCompanyIdState(id)
      }
    }
  }, [])

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null

  return (
    <CompanyContext.Provider
      value={{
        selectedCompanyId,
        setSelectedCompanyId,
        companies,
        loadCompanies,
        selectedCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}
