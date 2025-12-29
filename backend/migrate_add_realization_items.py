"""
Скрипт для создания таблицы realization_items
Запуск: python migrate_add_realization_items.py
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
        
        # Проверяем, существует ли таблица realization_items
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='realization_items'
        """)
        table_exists = cursor.fetchone()
        
        if table_exists:
            print("Таблица 'realization_items' уже существует")
        else:
            # Создаем таблицу realization_items
            print("Создаю таблицу 'realization_items'...")
            cursor.execute("""
                CREATE TABLE realization_items (
                    id SERIAL PRIMARY KEY,
                    realization_id INTEGER NOT NULL REFERENCES realizations(id) ON DELETE CASCADE,
                    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
                    quantity INTEGER NOT NULL,
                    price NUMERIC(15, 2) NOT NULL,
                    cost_price NUMERIC(15, 2) NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
                    CONSTRAINT chk_price_positive CHECK (price >= 0),
                    CONSTRAINT chk_cost_price_positive CHECK (cost_price >= 0)
                )
            """)
            
            # Создаем индексы
            cursor.execute("CREATE INDEX idx_realization_items_realization_id ON realization_items(realization_id)")
            cursor.execute("CREATE INDEX idx_realization_items_product_id ON realization_items(product_id)")
            
            print("Таблица 'realization_items' успешно создана!")
        
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

