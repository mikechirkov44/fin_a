import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { referenceService } from '../services/api'

interface Company {
  id: number
  name: string
}

const CompanySelector: React.FC = () => {
  const { user, selectedCompanyId, setSelectedCompany } = useAuth()
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadCompanies()
  }, [user])

  const loadCompanies = async () => {
    try {
      if (user?.role === 'ADMIN') {
        // Администратор видит все организации
        const allCompanies = await referenceService.getCompanies()
        setCompanies(allCompanies.filter((c: any) => c.is_active))
      } else if (user?.companies && user.companies.length > 0) {
        // Обычный пользователь видит только свои организации
        const allCompanies = await referenceService.getCompanies()
        const userCompanyIds = user.companies.map(uc => uc.company_id)
        setCompanies(allCompanies.filter((c: any) => 
          c.is_active && userCompanyIds.includes(c.id)
        ))
      }
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !user) return null

  // Если у пользователя только одна организация, не показываем селектор
  if (companies.length <= 1 && user.role !== 'ADMIN') return null

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const companyId = e.target.value ? parseInt(e.target.value, 10) : null
    setSelectedCompany(companyId)
  }

  return (
    <div style={{ marginRight: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <label htmlFor="company-select" style={{ fontWeight: 'bold' }}>
        Организация:
      </label>
      <select
        id="company-select"
        value={selectedCompanyId || ''}
        onChange={handleChange}
        style={{
          padding: '5px 10px',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '14px',
          minWidth: '200px'
        }}
      >
        {user.role === 'ADMIN' && (
          <option value="">Все организации</option>
        )}
        {companies.map(company => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default CompanySelector

