# Статус миграции на унифицированные UI компоненты

## ✅ Обновленные страницы и компоненты

### Страницы
- ✅ **Products.tsx** - полностью обновлен
- ✅ **Login.tsx** - полностью обновлен
- ✅ **Suppliers.tsx** - полностью обновлен
- ✅ **Customers.tsx** - полностью обновлен

### Компоненты
- ✅ **GlobalSearch** - использует Button и SearchInput
- ✅ **AdvancedFilters** - использует Button, Input и Select
- ✅ **PDFExportButton** - использует Button

## 🔄 Требуют обновления

### Страницы (примерный список)
- Input1.tsx
- Input2.tsx
- Realization.tsx
- Shipment.tsx
- Budget.tsx
- Reference.tsx
- MarketplaceIntegration.tsx
- BankCash.tsx
- Inventory.tsx
- InventoryTransactions.tsx
- WarehouseReports.tsx
- Warehouses.tsx
- Users.tsx
- Analytics.tsx
- Recommendations.tsx
- DashboardCustom.tsx
- Help.tsx
- И другие...

## 📝 Паттерн миграции

### 1. Обновить импорты
```tsx
import { Button, Input, Select, SearchInput } from '../components/ui'
```

### 2. Заменить button
**Было:**
```tsx
<button className="primary" onClick={handleClick}>
  Сохранить
</button>
```

**Стало:**
```tsx
<Button variant="primary" onClick={handleClick}>
  Сохранить
</Button>
```

### 3. Заменить input
**Было:**
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

**Стало:**
```tsx
<Input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

Или с FormField:
```tsx
<FormField label="Название">
  <Input
    type="text"
    value={value}
    onChange={(e) => setValue(e.target.value)}
  />
</FormField>
```

### 4. Заменить select
**Было:**
```tsx
<select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="">Выберите...</option>
  {options.map(opt => (
    <option key={opt.id} value={opt.id}>{opt.name}</option>
  ))}
</select>
```

**Стало:**
```tsx
<Select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Выберите..."
  options={options.map(opt => ({ value: opt.id, label: opt.name }))}
/>
```

### 5. Заменить поиск
**Было:**
```tsx
<input
  type="text"
  placeholder="Поиск..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

**Стало:**
```tsx
<SearchInput
  placeholder="Поиск..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onClear={() => setSearchQuery('')}
/>
```

### 6. Кнопки действий в таблицах
**Было:**
```tsx
<button
  className="action-button action-button-compact action-button-edit"
  onClick={handleEdit}
>
  <HiOutlinePencil />
</button>
```

**Стало:**
```tsx
<Button
  variant="primary"
  size="small"
  onClick={handleEdit}
  icon={<HiOutlinePencil />}
  title="Редактировать"
/>
```

## ⚠️ Особые случаи

### Input type="file"
Оставлять как есть - это нативный элемент, который нельзя заменить.

### Textarea
Оставлять как есть - пока нет унифицированного компонента Textarea (можно добавить позже).

### Кнопки только с иконками
Если кнопка содержит только иконку, можно использовать:
```tsx
<Button variant="primary" size="small" icon={<Icon />} />
```

## 📚 Документация

Полная документация по использованию компонентов:
- `UI_COMPONENTS_GUIDE.md` - подробное руководство
- `UI_UNIFICATION_SUMMARY.md` - краткое резюме
