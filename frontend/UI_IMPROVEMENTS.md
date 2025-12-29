# UI Улучшения - Документация

## Созданные компоненты

### 1. ConfirmDialog
Замена `window.confirm()` на красивые модальные окна.

**Использование:**
```tsx
import { useConfirm } from '../contexts/ConfirmContext'

const MyComponent = () => {
  const confirm = useConfirm()
  
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Удаление',
      message: 'Вы уверены?',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger', // 'danger' | 'warning' | 'info'
    })
    
    if (confirmed) {
      // Выполнить удаление
    }
  }
}
```

### 2. Pagination
Пагинация для таблиц с настройкой количества элементов на странице.

**Использование:**
```tsx
import Pagination from '../components/Pagination'

const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(25)

const paginatedData = data.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

<Pagination
  currentPage={currentPage}
  totalPages={Math.ceil(data.length / itemsPerPage)}
  totalItems={data.length}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
  onItemsPerPageChange={setItemsPerPage}
/>
```

### 3. ErrorBoundary
Обработка ошибок React компонентов.

**Использование:**
Уже добавлен в `App.tsx`, оборачивает все приложение.

### 4. Breadcrumbs
Навигационные хлебные крошки.

**Использование:**
Уже добавлен в `Layout.tsx`, автоматически генерируется на основе текущего пути.

### 5. Tooltip
Подсказки для элементов интерфейса.

**Использование:**
```tsx
import Tooltip from '../components/Tooltip'

<Tooltip content="Подсказка" position="top">
  <button>Кнопка</button>
</Tooltip>
```

### 6. AdvancedFilters
Расширенные фильтры с множественными условиями.

**Использование:**
```tsx
import AdvancedFilters from '../components/AdvancedFilters'

const filters = [
  {
    key: 'status',
    label: 'Статус',
    type: 'select',
    options: [
      { label: 'Активный', value: 'active' },
      { label: 'Неактивный', value: 'inactive' }
    ],
    value: ''
  }
]

<AdvancedFilters
  filters={filters}
  onFilterChange={(newFilters) => {
    // Применить фильтры
  }}
  onReset={() => {
    // Сбросить фильтры
  }}
/>
```

### 7. FormField
Поле формы с валидацией и отображением ошибок.

**Использование:**
```tsx
import FormField from '../components/FormField'

<FormField label="Название" required error={errors.name}>
  <input
    value={formData.name}
    onChange={(e) => {
      setFormData({ ...formData, name: e.target.value })
      if (errors.name) {
        setErrors({ ...errors, name: '' })
      }
    }}
  />
</FormField>
```

### 8. useFormValidation Hook
Хук для валидации форм.

**Использование:**
```tsx
import { useFormValidation } from '../hooks/useFormValidation'

const validation = useFormValidation({
  name: { required: true, min: 3 },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { required: true, min: 18, max: 100 }
})

const handleSubmit = (e) => {
  e.preventDefault()
  if (validation.validate(formData)) {
    // Форма валидна
  }
}

// В форме:
<FormField label="Название" required error={validation.errors.name}>
  <input ... />
</FormField>
```

### 9. useKeyboardShortcuts Hook
Горячие клавиши для быстрых действий.

**Использование:**
```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

useKeyboardShortcuts([
  {
    key: 'n',
    ctrl: true,
    action: () => {
      // Создать новый элемент
    },
    description: 'Создать новый'
  },
  {
    key: 'Escape',
    action: () => {
      // Закрыть форму
    }
  }
])
```

## Стили для таблиц

### Sticky Headers
Добавлены стили для фиксированных заголовков таблиц при прокрутке.

**Использование:**
```tsx
<div className="table-container">
  <table>
    <thead>
      {/* Заголовки будут зафиксированы при прокрутке */}
    </thead>
    <tbody>
      {/* Данные */}
    </tbody>
  </table>
</div>
```

## Интеграция в существующие страницы

### Обновленные страницы:
- ✅ `Products.tsx` - полная интеграция всех компонентов
- ✅ `Realization.tsx` - частичная интеграция (confirm, валидация)

### Страницы, требующие обновления:
- `Input1.tsx` - добавить confirm, валидацию, пагинацию
- `Input2.tsx` - добавить confirm, валидацию, пагинацию
- `Shipment.tsx` - добавить confirm, валидацию, пагинацию
- `Warehouses.tsx` - добавить confirm, валидацию
- `Users.tsx` - добавить confirm, валидацию
- И другие страницы с формами

## Паттерн обновления страницы

1. **Импорты:**
```tsx
import { useConfirm } from '../contexts/ConfirmContext'
import { useFormValidation } from '../hooks/useFormValidation'
import FormField from '../components/FormField'
import Pagination from '../components/Pagination'
import Tooltip from '../components/Tooltip'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
```

2. **В компоненте:**
```tsx
const confirm = useConfirm()
const validation = useFormValidation({ /* правила */ })
const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(25)

// Заменить window.confirm на:
const confirmed = await confirm({ ... })

// Добавить валидацию в handleSubmit:
if (!validation.validate(formData)) {
  showError('Исправьте ошибки')
  return
}

// Обернуть таблицу в table-container и добавить пагинацию
```

## Примечания

- Все компоненты поддерживают темную тему
- Компоненты адаптивны для мобильных устройств
- ErrorBoundary уже интегрирован в App.tsx
- ConfirmProvider уже добавлен в App.tsx
- Breadcrumbs автоматически работают в Layout

