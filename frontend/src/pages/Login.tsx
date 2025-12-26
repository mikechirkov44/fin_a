import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { authService } from '../services/api'
import './Login.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isRegister) {
        await authService.register(email, username, password)
      }
      await login(username, password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = 
        err?.response?.data?.detail || 
        err?.message || 
        (isRegister ? 'Ошибка регистрации' : 'Ошибка входа. Проверьте имя пользователя и пароль.')
      setError(errorMessage)
    }
  }

  return (
    <div className="login-container">
      <button 
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
          cursor: 'pointer',
          fontSize: '24px',
          transition: 'all 0.2s ease',
          zIndex: 1000
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <div className="login-card">
        <h1>Финансовая отчетность</h1>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="primary" style={{ width: '100%', marginTop: '12px' }}>
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login

