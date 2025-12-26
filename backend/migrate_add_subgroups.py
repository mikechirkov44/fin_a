"""
Скрипт миграции для добавления полей parent_group_id и subgroup_type в таблицы групп
Использование: python migrate_add_subgroups.py
"""
from sqlalchemy import text
from app.database import engine

def migrate():
    """Добавить поля для подгрупп"""
    print("Начало миграции: добавление полей для подгрупп...")
    
    with engine.connect() as conn:
        try:
            # Проверяем и добавляем поля в income_groups
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='income_groups' AND column_name='parent_group_id'
            """))
            if result.fetchone() is None:
                print("  Добавление parent_group_id и subgroup_type в income_groups...")
                conn.execute(text("""
                    ALTER TABLE income_groups 
                    ADD COLUMN parent_group_id INTEGER,
                    ADD COLUMN subgroup_type VARCHAR,
                    ADD CONSTRAINT fk_income_groups_parent 
                    FOREIGN KEY (parent_group_id) REFERENCES income_groups(id)
                """))
                conn.commit()
                print("  [OK] Поля добавлены в income_groups")
            else:
                print("  [OK] Поля уже существуют в income_groups")
            
            # Проверяем и добавляем поля в expense_groups
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='expense_groups' AND column_name='parent_group_id'
            """))
            if result.fetchone() is None:
                print("  Добавление parent_group_id и subgroup_type в expense_groups...")
                conn.execute(text("""
                    ALTER TABLE expense_groups 
                    ADD COLUMN parent_group_id INTEGER,
                    ADD COLUMN subgroup_type VARCHAR,
                    ADD CONSTRAINT fk_expense_groups_parent 
                    FOREIGN KEY (parent_group_id) REFERENCES expense_groups(id)
                """))
                conn.commit()
                print("  [OK] Поля добавлены в expense_groups")
            else:
                print("  [OK] Поля уже существуют в expense_groups")
            
            print("\n[SUCCESS] Миграция завершена успешно!")
            
        except Exception as e:
            print(f"\n[ERROR] Ошибка миграции: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()

