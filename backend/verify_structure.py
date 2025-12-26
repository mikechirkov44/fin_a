"""
Проверка финальной структуры таблицы marketplace_integrations
"""
from app.database import engine
from sqlalchemy import inspect

def verify_structure():
    inspector = inspect(engine)
    
    if "marketplace_integrations" not in inspector.get_table_names():
        print("[ERROR] Таблица marketplace_integrations не существует!")
        return False
    
    columns = {col['name']: col for col in inspector.get_columns('marketplace_integrations')}
    
    print("=" * 50)
    print("Структура таблицы marketplace_integrations")
    print("=" * 50)
    
    required_columns = [
        'id', 'marketplace_name', 'company_id',
        'ozon_client_id', 'ozon_api_key',
        'wb_api_key', 'wb_stat_api_key',
        'is_active', 'auto_sync', 'sync_interval_hours',
        'last_sync_at', 'last_sync_status', 'last_sync_error',
        'created_at', 'updated_at'
    ]
    
    all_ok = True
    for col_name in required_columns:
        if col_name in columns:
            col_type = str(columns[col_name]['type'])
            print(f"[OK] {col_name:25} - {col_type}")
        else:
            print(f"[MISSING] {col_name}")
            all_ok = False
    
    # Проверяем, что marketplace_id удален
    if 'marketplace_id' in columns:
        print(f"\n[WARN] Колонка marketplace_id все еще существует!")
        all_ok = False
    else:
        print(f"\n[OK] Колонка marketplace_id удалена")
    
    if all_ok:
        print("\n[SUCCESS] Структура таблицы корректна!")
    else:
        print("\n[ERROR] Есть проблемы со структурой таблицы")
    
    return all_ok

if __name__ == "__main__":
    verify_structure()

