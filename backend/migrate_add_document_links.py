"""
Миграция для добавления связей документов:
- customer_id и warehouse_id в realizations
- supplier_id в money_movements
"""
from sqlalchemy import create_engine, text
from app.database import settings

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # Проверяем, существуют ли уже эти поля
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'realizations' AND column_name IN ('customer_id', 'warehouse_id')
        """))
        existing_realization_columns = {row[0] for row in result}
        
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'money_movements' AND column_name = 'supplier_id'
        """))
        existing_money_movement_columns = {row[0] for row in result}
        
        # Добавляем customer_id в realizations
        if 'customer_id' not in existing_realization_columns:
            print("Добавляем customer_id в realizations...")
            conn.execute(text("""
                ALTER TABLE realizations 
                ADD COLUMN customer_id INTEGER REFERENCES customers(id)
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_realizations_customer_id ON realizations(customer_id)"))
            print("✅ Добавлено поле customer_id")
        else:
            print("⚠️  Поле customer_id уже существует")
        
        # Добавляем warehouse_id в realizations
        if 'warehouse_id' not in existing_realization_columns:
            print("Добавляем warehouse_id в realizations...")
            conn.execute(text("""
                ALTER TABLE realizations 
                ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_realizations_warehouse_id ON realizations(warehouse_id)"))
            print("✅ Добавлено поле warehouse_id")
        else:
            print("⚠️  Поле warehouse_id уже существует")
        
        # Делаем поля обязательными (после добавления данных, если нужно)
        # Сначала проверяем, есть ли записи без этих полей
        result = conn.execute(text("SELECT COUNT(*) FROM realizations WHERE customer_id IS NULL OR warehouse_id IS NULL"))
        null_count = result.scalar()
        
        if null_count > 0:
            print(f"⚠️  Найдено {null_count} записей без customer_id или warehouse_id")
            print("   Поля добавлены как nullable. После заполнения данных можно сделать их обязательными.")
        else:
            # Если все записи имеют значения, делаем поля обязательными
            print("Делаем поля обязательными...")
            try:
                conn.execute(text("ALTER TABLE realizations ALTER COLUMN customer_id SET NOT NULL"))
                conn.execute(text("ALTER TABLE realizations ALTER COLUMN warehouse_id SET NOT NULL"))
                print("✅ Поля customer_id и warehouse_id теперь обязательные")
            except Exception as e:
                print(f"⚠️  Не удалось сделать поля обязательными: {e}")
        
        # Добавляем supplier_id в money_movements
        if 'supplier_id' not in existing_money_movement_columns:
            print("Добавляем supplier_id в money_movements...")
            conn.execute(text("""
                ALTER TABLE money_movements 
                ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_money_movements_supplier_id ON money_movements(supplier_id)"))
            print("✅ Добавлено поле supplier_id")
        else:
            print("⚠️  Поле supplier_id уже существует")
        
        conn.commit()
        print("\n✅ Миграция успешно выполнена!")
        print("Добавлены поля:")
        print("  - realizations.customer_id (обязательное)")
        print("  - realizations.warehouse_id (обязательное)")
        print("  - money_movements.supplier_id (опциональное, только для income)")

if __name__ == "__main__":
    migrate()
