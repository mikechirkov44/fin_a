"""
Проверка существования таблицы и выполнение миграции или создания таблиц
"""
from app.database import engine
from sqlalchemy import inspect, text

def check_and_migrate():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("=" * 50)
    print("Проверка структуры базы данных")
    print("=" * 50)
    print(f"\nСуществующие таблицы: {len(tables)}")
    for t in tables:
        print(f"  - {t}")
    
    table_exists = "marketplace_integrations" in tables
    
    if table_exists:
        print(f"\n[OK] Таблица marketplace_integrations существует")
        
        # Проверяем структуру
        columns = [col['name'] for col in inspector.get_columns('marketplace_integrations')]
        print(f"  Колонки: {', '.join(columns)}")
        
        has_marketplace_id = 'marketplace_id' in columns
        has_marketplace_name = 'marketplace_name' in columns
        
        if has_marketplace_id and not has_marketplace_name:
            print("\n[WARN] Требуется миграция: замена marketplace_id на marketplace_name")
            print("Запускаю миграцию...")
            from migrate_marketplace_integration import run_migration
            run_migration()
        elif has_marketplace_name:
            print("\n[OK] Структура таблицы актуальна (marketplace_name уже существует)")
        else:
            print("\n[WARN] Неожиданная структура таблицы")
    else:
        print(f"\n[INFO] Таблица marketplace_integrations не существует")
        print("Создаю таблицы...")
        from create_tables import create_tables
        create_tables()
        print("\n[OK] Таблицы созданы!")

if __name__ == "__main__":
    try:
        check_and_migrate()
    except Exception as e:
        print(f"\n[ERROR] Ошибка: {e}")
        import traceback
        traceback.print_exc()

