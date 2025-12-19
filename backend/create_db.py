"""
Скрипт для создания базы данных (если нужно)
Использование: python create_db.py
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

def create_database():
    # Подключение к PostgreSQL (к базе postgres по умолчанию)
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="1011",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Проверка существования БД
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'fin_a'")
        exists = cursor.fetchone()
        
        if exists:
            print("База данных 'fin_a' уже существует")
        else:
            cursor.execute('CREATE DATABASE fin_a')
            print("База данных 'fin_a' успешно создана")
        
        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        print(f"Ошибка подключения к PostgreSQL: {e}")
        print("\nУбедитесь, что:")
        print("1. PostgreSQL установлен и запущен")
        print("2. Пользователь 'postgres' существует")
        print("3. Пароль 'postgres' правильный (или измените в скрипте)")
        sys.exit(1)
    except Exception as e:
        print(f"Ошибка: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_database()

