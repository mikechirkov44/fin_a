"""
Скрипт миграции для добавления колонок group_id в таблицы income_items и expense_items
Использование: python migrate_add_group_id.py
"""
from sqlalchemy import text
from app.database import engine

def migrate():
    """Добавить колонки group_id"""
    print("Начало миграции: добавление group_id...")
    
    with engine.connect() as conn:
        try:
            # Проверяем, существует ли колонка group_id в income_items
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='income_items' AND column_name='group_id'
            """))
            if result.fetchone() is None:
                print("  Добавление group_id в income_items...")
                conn.execute(text("""
                    ALTER TABLE income_items 
                    ADD COLUMN group_id INTEGER,
                    ADD CONSTRAINT fk_income_items_group 
                    FOREIGN KEY (group_id) REFERENCES income_groups(id)
                """))
                conn.commit()
                print("  [OK] Колонка group_id добавлена в income_items")
            else:
                print("  [OK] Колонка group_id уже существует в income_items")
            
            # Проверяем, существует ли колонка group_id в expense_items
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='expense_items' AND column_name='group_id'
            """))
            if result.fetchone() is None:
                print("  Добавление group_id в expense_items...")
                conn.execute(text("""
                    ALTER TABLE expense_items 
                    ADD COLUMN group_id INTEGER,
                    ADD CONSTRAINT fk_expense_items_group 
                    FOREIGN KEY (group_id) REFERENCES expense_groups(id)
                """))
                conn.commit()
                print("  [OK] Колонка group_id добавлена в expense_items")
            else:
                print("  [OK] Колонка group_id уже существует в expense_items")
            
            print("\n[SUCCESS] Миграция завершена успешно!")
            
        except Exception as e:
            print(f"\n[ERROR] Ошибка миграции: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()

