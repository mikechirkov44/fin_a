import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ColorScheme = 'light-1' | 'light-2' | 'light-4' | 'light-5' | 'dark'

interface ThemeContextType {
  theme: ColorScheme
  setTheme: (theme: ColorScheme) => void
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ColorScheme>(() => {
    const savedTheme = localStorage.getItem('theme')
    const validThemes: ColorScheme[] = ['light-1', 'light-2', 'light-4', 'light-5', 'dark']
    const initialTheme = validThemes.includes(savedTheme as ColorScheme) ? (savedTheme as ColorScheme) : 'light-1'
    
    // Применяем тему сразу при инициализации, до первого рендера
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', initialTheme)
    }
    
    return initialTheme
  })

  useEffect(() => {
    // Применяем тему к body при изменении
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const setTheme = (newTheme: ColorScheme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'dark' ? 'light-1' : 'dark')
  }

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

