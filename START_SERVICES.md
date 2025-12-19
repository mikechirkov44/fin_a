# Инструкция по запуску сервисов

## Шаг 1: Установка и запуск PostgreSQL

1. Установите PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Запустите PostgreSQL сервис
3. Создайте базу данных одним из способов:

### Способ 1: Через SQL скрипт
```sql
-- Выполните в pgAdmin или psql
CREATE DATABASE fin_a;
```

### Способ 2: Через Python скрипт
```bash
cd backend
python create_db.py
```

### Способ 3: Через командную строку PostgreSQL
```bash
psql -U postgres
CREATE DATABASE fin_a;
\q
```

## Шаг 2: Настройка .env файла

Файл `.env` уже создан в папке `backend` с настройками по умолчанию:
- DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fin_a
- SECRET_KEY (измените в продакшене!)

Если у вас другие настройки PostgreSQL, отредактируйте файл `backend/.env`

## Шаг 3: Запуск Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Backend будет доступен по адресу: http://localhost:8000
API документация: http://localhost:8000/docs

## Шаг 4: Запуск Frontend

В новом терминале:
```bash
cd frontend
npm run dev
```

Frontend будет доступен по адресу: http://localhost:3000

## Проверка работы

1. Откройте браузер: http://localhost:3000
2. Зарегистрируйте нового пользователя
3. Войдите в систему
4. Начните работу!

## Остановка сервисов

Нажмите `Ctrl+C` в терминалах, где запущены сервисы.

## Устранение проблем

### Ошибка подключения к PostgreSQL
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки в `backend/.env`
- Убедитесь, что база данных `fin_a` создана

### Ошибка портов заняты
- Измените порты в командах запуска
- Или остановите процессы, использующие порты 8000 и 3000

### Ошибки зависимостей
- Backend: `pip install -r requirements.txt`
- Frontend: `npm install`

