import { useState, useEffect } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import Modal from './Modal'
import './KeyboardShortcutsHelp.css'

const KeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false)

  useKeyboardShortcuts([
    {
      key: '/',
      ctrl: true,
      action: () => setIsOpen(true),
      description: 'Показать все горячие клавиши'
    }
  ])

  const shortcuts = [
    {
      category: 'Общие',
      items: [
        { keys: 'Ctrl + K', description: 'Открыть глобальный поиск' },
        { keys: 'Ctrl + /', description: 'Показать все горячие клавиши' },
        { keys: 'Escape', description: 'Закрыть модальное окно или форму' },
      ]
    },
    {
      category: 'Создание записей',
      items: [
        { keys: 'Ctrl + N', description: 'Создать новую запись (в любом модуле)' },
      ]
    },
    {
      category: 'Формы',
      items: [
        { keys: 'Ctrl + S', description: 'Сохранить форму' },
        { keys: 'Escape', description: 'Отменить и закрыть форму' },
      ]
    },
    {
      category: 'Таблицы',
      items: [
        { keys: 'Ctrl + F', description: 'Поиск в таблице' },
        { keys: '↑ ↓', description: 'Навигация по строкам' },
        { keys: 'Enter', description: 'Открыть выбранную строку' },
      ]
    },
    {
      category: 'Экспорт',
      items: [
        { keys: 'Ctrl + E', description: 'Экспорт данных' },
      ]
    },
  ]

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      title="Горячие клавиши"
      onClose={() => setIsOpen(false)}
      size="large"
    >
      <div className="keyboard-shortcuts-help">
        {shortcuts.map((category, idx) => (
          <div key={idx} className="shortcuts-category">
            <h3>{category.category}</h3>
            <div className="shortcuts-list">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="shortcut-item">
                  <div className="shortcut-keys">
                    {item.keys.split(' + ').map((key, keyIdx) => (
                      <kbd key={keyIdx}>{key}</kbd>
                    ))}
                  </div>
                  <div className="shortcut-description">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="shortcuts-footer">
          <p>Нажмите <kbd>Ctrl + /</kbd> в любой момент, чтобы открыть эту справку</p>
        </div>
      </div>
    </Modal>
  )
}

export default KeyboardShortcutsHelp

