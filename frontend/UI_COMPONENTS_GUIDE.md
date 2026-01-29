# Руководство по унифицированным UI компонентам

## Обзор

Создана единая система UI компонентов для унификации всех элементов форм: кнопок, полей ввода, выпадающих списков и поиска. Все компоненты используют единые стили, основанные на CSS переменных проекта, что обеспечивает согласованность дизайна и поддержку всех тем.

## Компоненты

### Button

Унифицированный компонент кнопки с поддержкой различных вариантов и размеров.

**Импорт:**
```tsx
import { Button } from '../components/ui'
```

**Использование:**
```tsx
// Основные варианты
<Button variant="primary">Сохранить</Button>
<Button variant="secondary">Отмена</Button>
<Button variant="danger">Удалить</Button>
<Button variant="ghost">Просмотр</Button>

// Размеры
<Button size="small">Маленькая</Button>
<Button size="medium">Средняя</Button>
<Button size="large">Большая</Button>

// С иконками
<Button variant="primary" icon={<HiOutlinePlus />} iconPosition="left">
  Добавить
</Button>

// Состояния
<Button variant="primary" loading>Загрузка...</Button>
<Button variant="primary" disabled>Недоступно</Button>

// Полная ширина
<Button variant="primary" fullWidth>Полная ширина</Button>
```

**Props:**
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - вариант кнопки
- `size?: 'small' | 'medium' | 'large'` - размер кнопки
- `loading?: boolean` - состояние загрузки
- `icon?: ReactNode` - иконка
- `iconPosition?: 'left' | 'right'` - позиция иконки
- `fullWidth?: boolean` - полная ширина
- Все стандартные HTML атрибуты кнопки

---

### Input

Унифицированный компонент поля ввода с поддержкой иконок и состояний ошибки.

**Импорт:**
```tsx
import { Input } from '../components/ui'
```

**Использование:**
```tsx
// Базовое использование
<Input
  label="Название"
  placeholder="Введите название"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// С иконками
<Input
  label="Email"
  leftIcon={<HiOutlineMail />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// С ошибкой
<Input
  label="Email"
  error="Неверный формат email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// С подсказкой
<Input
  label="Пароль"
  hint="Минимум 8 символов"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// Различные типы
<Input type="text" label="Текст" />
<Input type="number" label="Число" />
<Input type="date" label="Дата" />
<Input type="email" label="Email" />
<Input type="password" label="Пароль" />
```

**Props:**
- `error?: string` - сообщение об ошибке
- `label?: string` - метка поля
- `hint?: string` - подсказка
- `leftIcon?: ReactNode` - иконка слева
- `rightIcon?: ReactNode` - иконка справа
- `fullWidth?: boolean` - полная ширина (по умолчанию true)
- Все стандартные HTML атрибуты input

---

### Select

Унифицированный компонент выпадающего списка.

**Импорт:**
```tsx
import { Select } from '../components/ui'
```

**Использование:**
```tsx
// Базовое использование
<Select
  label="Статус"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={[
    { value: 'active', label: 'Активный' },
    { value: 'inactive', label: 'Неактивный' }
  ]}
/>

// С placeholder
<Select
  label="Выберите опцию"
  placeholder="Выберите..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  options={options}
/>

// С ошибкой
<Select
  label="Статус"
  error="Обязательное поле"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
  options={options}
/>
```

**Props:**
- `error?: string` - сообщение об ошибке
- `label?: string` - метка поля
- `hint?: string` - подсказка
- `options: SelectOption[]` - массив опций
- `placeholder?: string` - placeholder для первой опции
- `fullWidth?: boolean` - полная ширина (по умолчанию true)
- Все стандартные HTML атрибуты select

**SelectOption:**
```tsx
interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}
```

---

### SearchInput

Унифицированный компонент поиска с иконкой и кнопкой очистки.

**Импорт:**
```tsx
import { SearchInput } from '../components/ui'
```

**Использование:**
```tsx
// Базовое использование
<SearchInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Поиск..."
/>

// С обработчиком очистки
<SearchInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onClear={() => {
    setSearchQuery('')
    // Дополнительная логика
  }}
/>

// Без кнопки очистки
<SearchInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  showClearButton={false}
/>

// Автоматическая ширина
<SearchInput
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  fullWidth={false}
/>
```

**Props:**
- `onClear?: () => void` - обработчик очистки
- `showClearButton?: boolean` - показывать кнопку очистки (по умолчанию true)
- `fullWidth?: boolean` - полная ширина (по умолчанию false)
- Все стандартные HTML атрибуты input (кроме type)

---

## Интеграция с FormField

Новые компоненты можно использовать вместе с существующим компонентом `FormField`:

```tsx
import FormField from '../components/FormField'
import { Input, Select } from '../components/ui'

<FormField label="Название" required error={errors.name}>
  <Input
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  />
</FormField>

<FormField label="Статус" error={errors.status}>
  <Select
    value={formData.status}
    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
    options={statusOptions}
  />
</FormField>
```

Или использовать встроенные label компонентов:

```tsx
<Input
  label="Название"
  required
  error={errors.name}
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
/>
```

---

## Миграция существующего кода

### Замена обычных кнопок

**Было:**
```tsx
<button className="primary" onClick={handleSave}>
  Сохранить
</button>
```

**Стало:**
```tsx
import { Button } from '../components/ui'

<Button variant="primary" onClick={handleSave}>
  Сохранить
</Button>
```

### Замена полей ввода

**Было:**
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="form-input"
/>
```

**Стало:**
```tsx
import { Input } from '../components/ui'

<Input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### Замена выпадающих списков

**Было:**
```tsx
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="">Выберите...</option>
  {options.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

**Стало:**
```tsx
import { Select } from '../components/ui'

<Select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Выберите..."
  options={options.map(opt => ({ value: opt.value, label: opt.label }))}
/>
```

---

## Преимущества

1. **Единый стиль** - все элементы форм выглядят одинаково
2. **Поддержка тем** - автоматическая поддержка всех цветовых схем
3. **Доступность** - встроенная поддержка ARIA атрибутов
4. **Типизация** - полная поддержка TypeScript
5. **Переиспользование** - легко использовать в любом месте приложения
6. **Минимальные изменения** - можно постепенно мигрировать существующий код

---

## Обновленные компоненты

Следующие компоненты уже обновлены для использования новых UI компонентов:

- ✅ `GlobalSearch` - использует `Button` и `SearchInput`
- ✅ `AdvancedFilters` - использует `Button`, `Input` и `Select`

---

## Примеры использования в страницах

### Форма создания/редактирования

```tsx
import { Button, Input, Select } from '../components/ui'
import FormField from '../components/FormField'

const ProductForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: ''
  })
  const [errors, setErrors] = useState({})

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Название" required error={errors.name}>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </FormField>

      <FormField label="SKU" error={errors.sku}>
        <Input
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
        />
      </FormField>

      <FormField label="Цена" required error={errors.price}>
        <Input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        />
      </FormField>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <Button variant="secondary" onClick={handleCancel}>
          Отмена
        </Button>
        <Button variant="primary" type="submit">
          Сохранить
        </Button>
      </div>
    </form>
  )
}
```

### Поиск и фильтры

```tsx
import { SearchInput, Button } from '../components/ui'
import AdvancedFilters from '../components/AdvancedFilters'

const ProductsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск товаров..."
          fullWidth={false}
        />
        <Button variant="primary" icon={<HiOutlinePlus />}>
          Добавить
        </Button>
        <AdvancedFilters filters={filters} onFilterChange={handleFilterChange} onReset={handleReset} />
      </div>
      {/* Таблица */}
    </div>
  )
}
```

---

## Стилизация

Все компоненты используют CSS переменные проекта, определенные в `styles/index.css`. Это означает, что они автоматически поддерживают все темы (light-1, light-2, light-4, light-5, dark).

Для кастомизации отдельных компонентов можно использовать `className` prop или переопределить CSS переменные для конкретного контекста.

---

## Дополнительная информация

- Все компоненты находятся в `src/components/ui/`
- Стили компонентов в соответствующих `.css` файлах
- Экспорт всех компонентов через `src/components/ui/index.ts`
