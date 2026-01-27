import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/action-buttons.css'

// Установка русской локали для календаря
// Браузеры используют локаль из атрибута lang HTML элемента
document.documentElement.lang = 'ru-RU'

// Для дополнительной поддержки устанавливаем локаль для всех date input
if (typeof window !== 'undefined' && document.body) {
  // Устанавливаем локаль для календаря при загрузке
  const setDateLocale = () => {
    const dateInputs = document.querySelectorAll('input[type="date"]')
    dateInputs.forEach((input: Element) => {
      const htmlInput = input as HTMLInputElement
      // Устанавливаем локаль через атрибут lang
      if (htmlInput && !htmlInput.getAttribute('lang')) {
        htmlInput.setAttribute('lang', 'ru-RU')
      }
    })
  }

  // Вызываем при загрузке
  setDateLocale()

  // Также вызываем при динамическом добавлении элементов
  const observer = new MutationObserver(() => {
    setDateLocale()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

