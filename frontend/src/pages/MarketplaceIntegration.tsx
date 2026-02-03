import { useState, useEffect } from 'react'
import { marketplaceIntegrationService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import Modal from '../components/Modal'
import { format, subDays } from 'date-fns'
import { HiOutlinePencil, HiOutlineTrash, HiOutlineArrowPath, HiOutlineLink, HiOutlinePlus } from 'react-icons/hi2'
import { Button, Input, Select } from '../components/ui'
import Tooltip from '../components/Tooltip'

const MarketplaceIntegration = () => {
  const { selectedCompanyId, companies } = useAuth()
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<any>(null)
  const [formData, setFormData] = useState({
    marketplace_name: '',
    company_id: selectedCompanyId || '',
    ozon_client_id: '',
    ozon_api_key: '',
    wb_api_key: '',
    wb_stat_api_key: '',
    is_active: true,
    auto_sync: false,
    sync_interval_hours: 24,
  })
  const [syncLoading, setSyncLoading] = useState<number | null>(null)
  const [testLoading, setTestLoading] = useState<number | null>(null)
  const [syncPeriod, setSyncPeriod] = useState({ start: '', end: '' })

  useEffect(() => {
    loadData()
    
    // Автоматическое обновление статуса каждые 10 секунд, если есть синхронизации в процессе
    const interval = setInterval(() => {
      const hasInProgress = integrations.some((i: any) => i.last_sync_status === 'in_progress')
      if (hasInProgress) {
        loadData()
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [integrations.length])

  const loadData = async () => {
    try {
      const data = await marketplaceIntegrationService.getIntegrations()
      setIntegrations(data)
    } catch (error) {
      console.error('Error loading integrations:', error)
    }
  }
  
  // Список поддерживаемых маркетплейсов
  const supportedMarketplaces = [
    { value: 'OZON', label: 'OZON' },
    { value: 'Wildberries', label: 'Wildberries' },
    { value: 'WB', label: 'WB (Wildberries)' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        company_id: parseInt(formData.company_id),
        sync_interval_hours: parseInt(formData.sync_interval_hours.toString()),
      }
      
      if (editingIntegration) {
        await marketplaceIntegrationService.updateIntegration(editingIntegration.id, submitData)
      } else {
        await marketplaceIntegrationService.createIntegration(submitData)
      }
      
      handleClose()
      loadData()
    } catch (error: any) {
      showError(`Ошибка сохранения: ${error.response?.data?.detail || error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      marketplace_name: '',
      company_id: selectedCompanyId || '',
      ozon_client_id: '',
      ozon_api_key: '',
      wb_api_key: '',
      wb_stat_api_key: '',
      is_active: true,
      auto_sync: false,
      sync_interval_hours: 24,
    })
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingIntegration(null)
    resetForm()
  }

  const handleEdit = (integration: any) => {
    setEditingIntegration(integration)
    setFormData({
      marketplace_name: integration.marketplace_name,
      company_id: integration.company_id.toString(),
      ozon_client_id: integration.ozon_client_id || '',
      ozon_api_key: '', // Не показываем существующий ключ
      wb_api_key: '', // Не показываем существующий ключ
      wb_stat_api_key: '', // Не показываем существующий ключ
      is_active: integration.is_active,
      auto_sync: integration.auto_sync,
      sync_interval_hours: integration.sync_interval_hours,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Удаление интеграции',
      message: 'Вы уверены, что хотите удалить эту интеграцию?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await marketplaceIntegrationService.deleteIntegration(id)
      showSuccess('Интеграция успешно удалена')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления интеграции')
    }
  }

  const handleSync = async (integration: any) => {
    // Показываем диалог выбора периода
    const startDate = syncPeriod.start || format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const endDate = syncPeriod.end || format(new Date(), 'yyyy-MM-dd')
    
    const periodText = `с ${startDate} по ${endDate}`
    const confirmed = await confirm({
      title: 'Запуск синхронизации',
      message: `Запустить синхронизацию для ${integration.marketplace_name || 'маркетплейса'} за период ${periodText}?`,
      confirmText: 'Запустить',
      cancelText: 'Отмена',
    })
    if (!confirmed) return
    
    setSyncLoading(integration.id)
    try {
      const result = await marketplaceIntegrationService.syncMarketplace({
        integration_id: integration.id,
        company_id: integration.company_id,
        start_date: startDate,
        end_date: endDate,
      })
      
      showSuccess(result.message + '\nСинхронизация запущена в фоне. Обновите страницу через несколько минут для проверки результатов.')
      // Обновляем данные через 2 секунды
      setTimeout(() => {
        loadData()
      }, 2000)
    } catch (error: any) {
      showError(`Ошибка синхронизации: ${error.response?.data?.detail || error.message}`)
    } finally {
      setSyncLoading(null)
    }
  }

  const handleTestConnection = async (integration: any) => {
    setTestLoading(integration.id)
    try {
      const result = await marketplaceIntegrationService.testConnection(integration.id)
      showSuccess(result.message)
    } catch (error: any) {
      showError(`Ошибка: ${error.response?.data?.detail || error.message}`)
    } finally {
      setTestLoading(null)
    }
  }

  const getCompanyName = (companyId: number) => {
    const company = companies.find(c => c.id === companyId)
    return company?.name || '-'
  }

  const isOzon = (marketplaceName: string) => {
    return marketplaceName?.toLowerCase().includes('ozon')
  }

  const isWildberries = (marketplaceName: string) => {
    return marketplaceName?.toLowerCase().includes('wildberries') || 
           marketplaceName?.toLowerCase().includes('wb')
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Интеграции с маркетплейсами</h2>
        <Button variant="primary" icon={<HiOutlinePlus />} onClick={() => { setShowForm(true); setEditingIntegration(null); resetForm() }}>
          Добавить интеграцию
        </Button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingIntegration ? 'Редактировать интеграцию' : 'Добавить интеграцию'}
        maxWidth="900px"
      >
        <form onSubmit={handleSubmit}>
            <div className="form-row">
              <Select
                label="Маркетплейс"
                required
                value={formData.marketplace_name}
                onChange={(e) => setFormData({ ...formData, marketplace_name: e.target.value })}
                disabled={!!editingIntegration}
                placeholder="Выберите..."
                options={[
                  { value: '', label: 'Выберите...' },
                  ...supportedMarketplaces.map(m => ({
                    value: m.value,
                    label: m.label
                  }))
                ]}
              />
              <Select
                label="Организация"
                required
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                disabled={!!editingIntegration}
                placeholder="Выберите..."
                options={[
                  { value: '', label: 'Выберите...' },
                  ...companies.filter(c => c.is_active).map(c => ({
                    value: c.id.toString(),
                    label: c.name
                  }))
                ]}
              />
            </div>

            {formData.marketplace_name && isOzon(formData.marketplace_name) && (
              <>
                <div className="form-row">
                  <Input
                    label="OZON Client ID"
                    required={isOzon(formData.marketplace_name)}
                    type="text"
                    value={formData.ozon_client_id}
                    onChange={(e) => setFormData({ ...formData, ozon_client_id: e.target.value })}
                    placeholder="Введите Client ID из личного кабинета OZON"
                  />
                  <Input
                    label="OZON API Key"
                    required={isOzon(formData.marketplace_name)}
                    type="password"
                    value={formData.ozon_api_key}
                    onChange={(e) => setFormData({ ...formData, ozon_api_key: e.target.value })}
                    placeholder="Введите API Key из личного кабинета OZON"
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  Как получить API ключи: Настройки → API → Создать ключ
                </div>
              </>
            )}

            {formData.marketplace_name && isWildberries(formData.marketplace_name) && (
              <>
                <div className="form-row">
                  <Input
                    label="Wildberries API Key"
                    required={isWildberries(formData.marketplace_name)}
                    type="password"
                    value={formData.wb_api_key}
                    onChange={(e) => setFormData({ ...formData, wb_api_key: e.target.value })}
                    placeholder="Введите API Key из личного кабинета WB"
                  />
                  <Input
                    label="Wildberries Stat API Key (опционально)"
                    type="password"
                    value={formData.wb_stat_api_key}
                    onChange={(e) => setFormData({ ...formData, wb_stat_api_key: e.target.value })}
                    placeholder="Введите Stat API Key (если отличается)"
                  />
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  Как получить API ключи: Настройки → API → Создать ключ
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Активна
                </label>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.auto_sync}
                    onChange={(e) => setFormData({ ...formData, auto_sync: e.target.checked })}
                  />
                  Автоматическая синхронизация
                </label>
              </div>
              {formData.auto_sync && (
                <Input
                  label="Интервал синхронизации (часов)"
                  type="number"
                  min="1"
                  value={formData.sync_interval_hours}
                  onChange={(e) => setFormData({ ...formData, sync_interval_hours: parseInt(e.target.value) || 24 })}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'space-between' }}>
              <div>
                {editingIntegration && (
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Удаление интеграции',
                        message: 'Вы уверены, что хотите удалить эту интеграцию?',
                        confirmText: 'Удалить',
                        cancelText: 'Отмена',
                        type: 'danger',
                      })
                      if (confirmed) {
                        try {
                          await marketplaceIntegrationService.deleteIntegration(editingIntegration.id)
                          showSuccess('Интеграция успешно удалена')
                          handleClose()
                          loadData()
                        } catch (error: any) {
                          showError(error.response?.data?.detail || 'Ошибка удаления интеграции')
                        }
                      }
                    }}
                    icon={<HiOutlineTrash />}
                  >
                    Удалить
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button type="button" variant="secondary" onClick={handleClose}>
                  Отмена
                </Button>
                <Button type="submit" variant="primary">
                  Сохранить
                </Button>
              </div>
            </div>
          </form>
      </Modal>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">Параметры синхронизации</div>
        <div style={{ padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Input
            label="Дата начала"
            type="date"
            value={syncPeriod.start || format(subDays(new Date(), 30), 'yyyy-MM-dd')}
            onChange={(e) => setSyncPeriod({ ...syncPeriod, start: e.target.value })}
            fullWidth={false}
          />
          <Input
            label="Дата окончания"
            type="date"
            value={syncPeriod.end || format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setSyncPeriod({ ...syncPeriod, end: e.target.value })}
            fullWidth={false}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
            По умолчанию: последние 30 дней
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Настроенные интеграции</div>
        <table>
          <thead>
            <tr>
              <th>Маркетплейс</th>
              <th>Организация</th>
              <th>Статус</th>
              <th>Последняя синхронизация</th>
              <th>Автосинхронизация</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {integrations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">Нет настроенных интеграций</td>
              </tr>
            ) : (
              integrations.map((integration) => (
                <tr 
                  key={integration.id}
                  onClick={() => handleEdit(integration)}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = ''
                  }}
                >
                  <td>{integration.marketplace_name}</td>
                  <td>{getCompanyName(integration.company_id)}</td>
                  <td>
                    <span style={{ 
                      color: integration.is_active ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {integration.is_active ? 'Активна' : 'Неактивна'}
                    </span>
                    {integration.last_sync_status && (
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {integration.last_sync_status === 'success' && '✓ Успешно'}
                        {integration.last_sync_status === 'error' && '✗ Ошибка'}
                        {integration.last_sync_status === 'in_progress' && '⟳ В процессе'}
                      </div>
                    )}
                  </td>
                  <td>
                    {integration.last_sync_at 
                      ? format(new Date(integration.last_sync_at), 'dd.MM.yyyy HH:mm')
                      : 'Никогда'}
                    {integration.last_sync_error && (
                      <div style={{ fontSize: '11px', color: '#dc3545', marginTop: '4px', cursor: 'help' }} title={integration.last_sync_error}>
                        ⚠ {integration.last_sync_error.length > 50 ? integration.last_sync_error.substring(0, 50) + '...' : integration.last_sync_error}
                      </div>
                    )}
                  </td>
                  <td>
                    {integration.auto_sync ? `Каждые ${integration.sync_interval_hours} ч.` : 'Нет'}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons-group" style={{ flexWrap: 'nowrap' }}>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleTestConnection(integration)}
                        disabled={testLoading === integration.id}
                        icon={testLoading === integration.id ? undefined : <HiOutlineLink />}
                        title="Проверить подключение к API"
                      >
                        {testLoading === integration.id ? '⏳' : ''}
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleSync(integration)}
                        disabled={syncLoading === integration.id || !integration.is_active}
                        icon={syncLoading === integration.id ? undefined : <HiOutlineArrowPath />}
                        title="Синхронизировать данные с маркетплейсом"
                      >
                        {syncLoading === integration.id ? '⏳' : ''}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MarketplaceIntegration;
