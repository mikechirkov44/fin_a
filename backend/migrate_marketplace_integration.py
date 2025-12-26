"""
Миграция для изменения структуры таблицы marketplace_integrations
Заменяет marketplace_id на marketplace_name
"""
from sqlalchemy import create_engine, text
from app.database import settings

DATABASE_URL = settings.database_url

def run_migration():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("Running migration: Changing marketplace_id to marketplace_name...")
        try:
            # Проверяем, существует ли колонка marketplace_id
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='marketplace_integrations' 
                AND column_name='marketplace_id'
            """))
            
            if result.fetchone():
                # Удаляем внешний ключ
                try:
                    connection.execute(text("ALTER TABLE marketplace_integrations DROP CONSTRAINT IF EXISTS marketplace_integrations_marketplace_id_fkey;"))
                    print("  Удален внешний ключ marketplace_id")
                except:
                    pass
                
                # Удаляем индекс
                try:
                    connection.execute(text("DROP INDEX IF EXISTS ix_marketplace_integrations_marketplace_id;"))
                    print("  Удален индекс marketplace_id")
                except:
                    pass
                
                # Удаляем колонку
                connection.execute(text("ALTER TABLE marketplace_integrations DROP COLUMN marketplace_id;"))
                print("  Удалена колонка marketplace_id")
            
            # Проверяем, существует ли колонка marketplace_name
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='marketplace_integrations' 
                AND column_name='marketplace_name'
            """))
            
            if not result.fetchone():
                # Добавляем новую колонку
                connection.execute(text("ALTER TABLE marketplace_integrations ADD COLUMN marketplace_name VARCHAR(255);"))
                print("  Добавлена колонка marketplace_name")
                
                # Создаем индекс
                connection.execute(text("CREATE INDEX IF NOT EXISTS ix_marketplace_integrations_marketplace_name ON marketplace_integrations(marketplace_name);"))
                print("  Создан индекс marketplace_name")
            
            connection.commit()
            print("\n[SUCCESS] Миграция завершена успешно!")
            print("\nВНИМАНИЕ: Если в таблице были данные, нужно вручную заполнить marketplace_name!")
            print("Пример SQL для заполнения:")
            print("UPDATE marketplace_integrations SET marketplace_name = 'OZON' WHERE id = 1;")
            print("UPDATE marketplace_integrations SET marketplace_name = 'Wildberries' WHERE id = 2;")
        except Exception as e:
            print(f"  [ERROR] Ошибка во время миграции: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    run_migration()

