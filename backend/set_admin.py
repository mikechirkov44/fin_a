"""
Скрипт для назначения роли администратора пользователю
Использование: python set_admin.py <username>
Или: python set_admin.py --create-admin <username> <email> <password>
"""
import sys
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Загружаем переменные окружения
load_dotenv()

def get_db_connection():
    """Получить подключение к базе данных"""
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/fin_a')
    
    # Парсим URL
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
        db_name = 'fin_a'
        username = 'postgres'
        password = 'postgres'
        host = 'localhost'
        port = 5432
    
    return psycopg2.connect(
        host=host,
        port=port,
        user=username,
        password=password,
        database=db_name
    )

def set_admin(username: str):
    """Установить роль ADMIN для существующего пользователя"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем существование пользователя
        cursor.execute("SELECT id, username, role FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        if not user:
            print(f"ERROR: User '{username}' not found!")
            print("\nAvailable users:")
            cursor.execute("SELECT username, role FROM users")
            users = cursor.fetchall()
            for u in users:
                print(f"  - {u[0]} (role: {u[1]})")
            return False
        
        # Обновляем роль
        cursor.execute("UPDATE users SET role = 'ADMIN' WHERE username = %s", (username,))
        conn.commit()
        
        print(f"SUCCESS: User '{username}' is now an administrator!")
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False

def create_admin(username: str, email: str, password: str):
    """Создать нового пользователя с ролью администратора"""
    try:
        from app.auth.security import get_password_hash
        from app.models.user import UserRole
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем, не существует ли уже такой пользователь
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        if cursor.fetchone():
            print(f"ERROR: User with username '{username}' or email '{email}' already exists!")
            return False
        
        # Хешируем пароль
        hashed_password = get_password_hash(password)
        
        # Создаем пользователя
        cursor.execute("""
            INSERT INTO users (email, username, hashed_password, role, is_active)
            VALUES (%s, %s, %s, 'ADMIN', true)
        """, (email, username, hashed_password))
        
        conn.commit()
        print(f"SUCCESS: Administrator '{username}' created!")
        print(f"   Email: {email}")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Использование:")
        print("  1. Назначить роль ADMIN существующему пользователю:")
        print("     python set_admin.py <username>")
        print("  2. Создать нового администратора:")
        print("     python set_admin.py --create-admin <username> <email> <password>")
        print("\nПримеры:")
        print("  python set_admin.py testlogin")
        print("  python set_admin.py --create-admin admin admin@example.com admin123")
        sys.exit(1)
    
    if sys.argv[1] == "--create-admin":
        if len(sys.argv) < 5:
            print("❌ Недостаточно параметров!")
            print("Использование: python set_admin.py --create-admin <username> <email> <password>")
            sys.exit(1)
        username = sys.argv[2]
        email = sys.argv[3]
        password = sys.argv[4]
        create_admin(username, email, password)
    else:
        username = sys.argv[1]
        set_admin(username)

