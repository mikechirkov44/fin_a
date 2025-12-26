"""
Скрипт для добавления столбца role в таблицу users
Запуск: python migrate_add_user_role.py
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def migrate():
    # Получаем DATABASE_URL из .env
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/fin_a')
    
    # Парсим URL
    # Формат: postgresql://user:password@host:port/database
    if database_url.startswith('postgresql://'):
        url_parts = database_url.replace('postgresql://', '').split('/')
        db_name = url_parts[1] if len(url_parts) > 1 else 'fin_a'
        auth_parts = url_parts[0].split('@')
        user_pass = auth_parts[0].split(':')
        username = user_pass[0] if len(user_pass) > 0 else 'postgres'
        password = user_pass[1] if len(user_pass) > 1 else 'postgres'
        host_port = auth_parts[1].split(':') if len(auth_parts) > 1 else ['localhost', '5432']
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 5432
    else:
        # Значения по умолчанию
        db_name = 'fin_a'
        username = 'postgres'
        password = 'postgres'
        host = 'localhost'
        port = 5432
    
    try:
        # Подключаемся к базе данных
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=db_name
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Проверяем, существует ли столбец role
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role'
        """)
        exists = cursor.fetchone()
        
        if exists:
            print("Столбец 'role' уже существует в таблице 'users'")
        else:
            # Добавляем столбец role
            print("Добавляю столбец 'role' в таблицу 'users'...")
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN role VARCHAR(20) DEFAULT 'VIEWER' NOT NULL
            """)
            print("Столбец 'role' успешно добавлен!")
        
        # Проверяем, существует ли таблица user_companies
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='user_companies'
        """)
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Создаю таблицу 'user_companies'...")
            cursor.execute("""
                CREATE TABLE user_companies (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    role VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    UNIQUE(user_id, company_id)
                )
            """)
            cursor.execute("CREATE INDEX idx_user_companies_user_id ON user_companies(user_id)")
            cursor.execute("CREATE INDEX idx_user_companies_company_id ON user_companies(company_id)")
            print("Таблица 'user_companies' успешно создана!")
        else:
            print("Таблица 'user_companies' уже существует")
        
        cursor.close()
        conn.close()
        print("\nМиграция завершена успешно!")
        
    except psycopg2.OperationalError as e:
        print(f"Ошибка подключения к PostgreSQL: {e}")
        print("\nУбедитесь, что:")
        print("1. PostgreSQL установлен и запущен")
        print("2. База данных существует")
        print("3. Настройки в .env файле правильные")
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()

