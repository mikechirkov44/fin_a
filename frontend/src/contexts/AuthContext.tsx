import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

export interface UserCompany {
  id: number
  user_id: number
  company_id: number
  role: string
  created_at?: string
}

export interface User {
  id: number
  email: string
  username: string
  role: string
  is_active: boolean
  companies?: UserCompany[]
}

interface Company {
  id: number
  name: string
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  selectedCompanyId: number | null
  companies: Company[]
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  setSelectedCompany: (companyId: number | null) => void
  isAuthenticated: boolean
  isAdmin: boolean
  canWrite: (companyId?: number) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    () => {
      const saved = localStorage.getItem('selectedCompanyId')
      return saved ? parseInt(saved, 10) : null
    }
  )
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (token) {
      authService.setToken(token)
      fetchUser()
    }
  }, [token])

  const loadCompanies = async (userData: User) => {
    try {
      const { referenceService } = await import('../services/api')
      const allCompanies = await referenceService.getCompanies()
      const activeCompanies = allCompanies.filter((c: any) => c.is_active)
      
      if (userData.role === 'ADMIN') {
        // Администратор видит все активные организации
        setCompanies(activeCompanies)
      } else if (userData.companies && userData.companies.length > 0) {
        // Обычный пользователь видит только свои организации
        const userCompanyIds = userData.companies.map(uc => uc.company_id)
        const filteredCompanies = activeCompanies.filter((c: any) => 
          userCompanyIds.includes(c.id)
        )
        setCompanies(filteredCompanies)
      } else {
        // Если у пользователя нет связей, но есть организации в системе - показываем все
        // (пользователь сможет выбрать, но доступ будет ограничен на уровне API)
        setCompanies(activeCompanies)
      }
    } catch (error) {
      console.error('Error loading companies:', error)
      setCompanies([])
    }
  }

  const fetchUser = async () => {
    try {
      const userData = await authService.getCurrentUser()
      setUser(userData)
      
      // Загружаем организации
      await loadCompanies(userData)
      
      // Если у пользователя есть организации и не выбрана компания, выбираем первую
      if (userData.companies && userData.companies.length > 0 && !selectedCompanyId) {
        const firstCompanyId = userData.companies[0].company_id
        setSelectedCompanyId(firstCompanyId)
        localStorage.setItem('selectedCompanyId', firstCompanyId.toString())
      }
    } catch (error) {
      logout()
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password)
      setToken(response.access_token)
      localStorage.setItem('token', response.access_token)
      authService.setToken(response.access_token)
      await fetchUser()
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setSelectedCompanyId(null)
    localStorage.removeItem('token')
    localStorage.removeItem('selectedCompanyId')
    authService.setToken(null)
  }

  const setSelectedCompany = (companyId: number | null) => {
    setSelectedCompanyId(companyId)
    if (companyId) {
      localStorage.setItem('selectedCompanyId', companyId.toString())
    } else {
      localStorage.removeItem('selectedCompanyId')
    }
  }

  const isAdmin = user?.role === 'ADMIN'
  
  const canWrite = (companyId?: number): boolean => {
    if (isAdmin) return true
    if (!user) return false
    
    const checkCompanyId = companyId || selectedCompanyId
    if (!checkCompanyId) return false
    
    const userCompany = user.companies?.find(uc => uc.company_id === checkCompanyId)
    if (!userCompany) return false
    
    // ADMIN, ACCOUNTANT и MANAGER имеют права на запись
    return ['ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(userCompany.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        selectedCompanyId,
        companies,
        login,
        logout,
        setSelectedCompany,
        isAuthenticated: !!token,
        isAdmin,
        canWrite,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

