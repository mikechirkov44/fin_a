import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { authService } from '../services/api'
import { Button, Input } from '../components/ui'
import './Login.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isRegister) {
        await authService.register(email, username, password)
      }
      await login(username, password)
      setIsExiting(true)
      // Небольшая задержка для плавного перехода
      setTimeout(() => {
        navigate('/dashboard')
      }, 400)
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = 
        err?.response?.data?.detail || 
        err?.message || 
        (isRegister ? 'Ошибка регистрации' : 'Ошибка входа. Проверьте имя пользователя и пароль.')
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Button 
        variant="ghost"
        className="theme-toggle" 
        onClick={toggleTheme}
        title={theme === 'light' ? 'Переключить на темную тему' : 'Переключить на светлую тему'}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: '#fff',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '24px',
          zIndex: 1000
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </Button>
      <div className={`login-card ${isExiting ? 'login-card-exit' : ''}`}>
        <h1>Финансовая отчетность</h1>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <Input
            type="text"
            label="Имя пользователя"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            type="password"
            label="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error-message">{error}</div>}
          <Button 
            type="submit" 
            variant="primary" 
            fullWidth 
            style={{ marginTop: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : (isRegister ? 'Зарегистрироваться' : 'Войти')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsRegister(!isRegister)}
            fullWidth
            style={{ marginTop: '8px' }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Login

