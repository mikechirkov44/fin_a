import { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import FormField from '../components/FormField'
import './Settings.css'

type ColorScheme = 'light-1' | 'light-2' | 'light-4' | 'light-5' | 'dark'

const themeOptions = [
  { 
    value: 'light-1', 
    label: 'Классический деловой', 
    description: 'Сдержанная профессиональная палитра',
    colors: { bg: '#F5F5F5', accent: '#3366FF', secondary: '#E6F2FF' }
  },
  { 
    value: 'light-2', 
    label: 'Элегантная фиолетовая', 
    description: 'Премиальная палитра с фиолетовым акцентом',
    colors: { bg: '#FAF5FF', accent: '#8B5CF6', secondary: '#F3E8FF' }
  },
  { 
    value: 'light-4', 
    label: 'Теплый уютный', 
    description: 'Мягкие теплые оттенки',
    colors: { bg: '#FFF8F8', accent: '#FFB3B3', secondary: '#FFE5E5' }
  },
  { 
    value: 'light-5', 
    label: 'Минималистичный светлый', 
    description: 'Максимально светлая палитра',
    colors: { bg: '#FAFAFA', accent: '#6699FF', secondary: '#F5F5F5' }
  },
  { 
    value: 'dark', 
    label: 'Темная тема', 
    description: 'Классическая темная тема',
    colors: { bg: '#1a1a1a', accent: '#4a90e2', secondary: '#2d2d2d' }
  },
]

const Settings = () => {
  const { theme, setTheme } = useTheme()
  const { showSuccess } = useToast()
  const [selectedTheme, setSelectedTheme] = useState<ColorScheme>(theme)

  useEffect(() => {
    setSelectedTheme(theme)
  }, [theme])

  const handleThemeChange = (newTheme: ColorScheme) => {
    setSelectedTheme(newTheme)
    setTheme(newTheme)
    showSuccess('Тема успешно изменена')
  }

  return (
    <div className="settings-container">
      <div className="card">
        <h2 className="card-header">Настройки</h2>
        
        <FormField label="Цветовая схема">
          <div className="theme-options">
            {themeOptions.map((option) => {
              const isSelected = selectedTheme === option.value
              const isDarkTheme = option.value === 'dark'
              
              return (
                <div
                  key={option.value}
                  className={`theme-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleThemeChange(option.value as ColorScheme)}
                >
                  <div 
                    className="theme-preview"
                    style={{
                      '--preview-bg': option.colors.bg,
                      '--preview-accent': option.colors.accent,
                      '--preview-secondary': option.colors.secondary,
                    } as React.CSSProperties & Record<string, string>}
                  >
                    {isDarkTheme ? (
                      <div className="preview-dark">
                        <div className="preview-dark-bg"></div>
                        <div className="preview-dark-text"></div>
                      </div>
                    ) : (
                      <div className="preview-light">
                        <div className="preview-light-bg"></div>
                        <div className="preview-light-accent"></div>
                      </div>
                    )}
                  </div>
                  <div className="theme-info">
                    <div className="theme-name">{option.label}</div>
                    <div className="theme-description">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="theme-check">✓</div>
                  )}
                </div>
              )
            })}
          </div>
        </FormField>

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Информация</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
            Выбранная тема сохраняется автоматически и будет использоваться при следующем входе в систему.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Settings
