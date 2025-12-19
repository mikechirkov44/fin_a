# Инструкция по установке и запуску

## Требования

- Python 3.9+
- Node.js 18+
- PostgreSQL 12+

## Установка Backend

1. Перейдите в папку backend:
```bash
cd backend
```

2. Создайте виртуальное окружение (рекомендуется):
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

4. Создайте файл `.env` в папке `backend`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_a
SECRET_KEY=your-secret-key-change-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE fin_a;
```

6. Запустите сервер:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend будет доступен по адресу: http://localhost:8000

## Установка Frontend

1. Перейдите в папку frontend:
```bash
cd frontend
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите dev-сервер:
```bash
npm run dev
```

Frontend будет доступен по адресу: http://localhost:3000

## Первый запуск

1. Откройте http://localhost:3000
2. Зарегистрируйте нового пользователя
3. Войдите в систему
4. Начните работу со справочниками (статьи доходов, расходов, места оплаты)
5. Затем заполните данные в модулях ВВОД 1 и ВВОД 2

## Структура проекта

```
fin_a/
├── backend/              # FastAPI приложение
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # SQLAlchemy модели
│   │   ├── schemas/     # Pydantic схемы
│   │   ├── auth/        # Авторизация
│   │   └── database.py  # Настройка БД
│   ├── requirements.txt
│   └── main.py
│
├── frontend/             # React приложение
│   ├── src/
│   │   ├── components/  # React компоненты
│   │   ├── pages/       # Страницы
│   │   ├── services/    # API клиенты
│   │   └── contexts/    # React контексты
│   └── package.json
│
└── README.md
```

## API Документация

После запуска backend, документация API доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Импорт/Экспорт

### Экспорт данных

Доступен экспорт в форматах Excel (.xlsx) и CSV для:
- Движения денег (ВВОД 1)
- Реализации
- Товаров

### Импорт данных

Поддерживается импорт из Excel и CSV для:
- Движения денег (требуются предварительно созданные справочники)
- Товаров

Формат файлов должен соответствовать структуре таблиц в системе.

