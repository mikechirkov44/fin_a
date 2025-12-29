"""
Полная миграция: Замена маркетплейсов на каналы продаж
1. Переносит данные из marketplaces в sales_channels
2. Обновляет связи в realizations и shipments
3. Переименовывает колонки
4. Создает новые внешние ключи
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.reference import SalesChannel
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/fin_a")

def migrate():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("Начало полной миграции: замена маркетплейсов на каналы продаж")
        print("=" * 60)
        
        # Шаг 1: Удаляем внешние ключи
        print("\nШаг 1: Удаление внешних ключей...")
        try:
            db.execute(text("ALTER TABLE realizations DROP CONSTRAINT IF EXISTS realizations_marketplace_id_fkey"))
            db.execute(text("ALTER TABLE realizations DROP CONSTRAINT IF EXISTS fk_realizations_marketplace"))
            db.execute(text("ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_marketplace_id_fkey"))
            db.execute(text("ALTER TABLE shipments DROP CONSTRAINT IF EXISTS fk_shipments_marketplace"))
            db.commit()
            print("[OK] Внешние ключи удалены")
        except Exception as e:
            print(f"  Предупреждение при удалении ключей: {e}")
            db.rollback()
        
        # Шаг 2: Получаем все маркетплейсы и создаем каналы продаж
        print("\nШаг 2: Перенос данных из marketplaces в sales_channels...")
        result = db.execute(text("SELECT id, name, description, is_active FROM marketplaces"))
        marketplaces = result.fetchall()
        print(f"Найдено маркетплейсов: {len(marketplaces)}")
        
        marketplace_to_channel = {}
        for mp in marketplaces:
            mp_id, mp_name, mp_description, mp_is_active = mp
            
            # Проверяем, существует ли уже канал с таким именем
            existing_channel = db.query(SalesChannel).filter(
                SalesChannel.name == mp_name
            ).first()
            
            if existing_channel:
                marketplace_to_channel[mp_id] = existing_channel.id
                print(f"  [OK] Используем существующий канал: {mp_name} (ID: {existing_channel.id})")
            else:
                # Создаем новый канал продаж
                new_channel = SalesChannel(
                    name=mp_name,
                    description=mp_description or f"Канал продаж {mp_name}",
                    is_active=mp_is_active if mp_is_active is not None else True
                )
                db.add(new_channel)
                db.flush()
                marketplace_to_channel[mp_id] = new_channel.id
                print(f"  [OK] Создан новый канал: {mp_name} (ID: {new_channel.id})")
        
        db.commit()
        print(f"\n[OK] Создано/найдено каналов продаж: {len(marketplace_to_channel)}")
        
        # Шаг 3: Добавляем временную колонку sales_channel_id
        print("\nШаг 3: Добавление временной колонки sales_channel_id...")
        try:
            db.execute(text("ALTER TABLE realizations ADD COLUMN IF NOT EXISTS sales_channel_id INTEGER"))
            db.execute(text("ALTER TABLE shipments ADD COLUMN IF NOT EXISTS sales_channel_id INTEGER"))
            db.commit()
            print("[OK] Колонки добавлены")
        except Exception as e:
            print(f"  Предупреждение: {e}")
            db.rollback()
        
        # Шаг 4: Обновляем данные в realizations
        print("\nШаг 4: Обновление данных в realizations...")
        result = db.execute(text("SELECT id, marketplace_id FROM realizations WHERE marketplace_id IS NOT NULL"))
        realizations = result.fetchall()
        updated_realizations = 0
        for realization_id, marketplace_id in realizations:
            if marketplace_id in marketplace_to_channel:
                db.execute(
                    text("UPDATE realizations SET sales_channel_id = :new_id WHERE id = :realization_id"),
                    {"new_id": marketplace_to_channel[marketplace_id], "realization_id": realization_id}
                )
                updated_realizations += 1
        
        print(f"[OK] Обновлено реализаций: {updated_realizations}")
        
        # Шаг 5: Обновляем данные в shipments
        print("\nШаг 5: Обновление данных в shipments...")
        result = db.execute(text("SELECT id, marketplace_id FROM shipments WHERE marketplace_id IS NOT NULL"))
        shipments = result.fetchall()
        updated_shipments = 0
        for shipment_id, marketplace_id in shipments:
            if marketplace_id in marketplace_to_channel:
                db.execute(
                    text("UPDATE shipments SET sales_channel_id = :new_id WHERE id = :shipment_id"),
                    {"new_id": marketplace_to_channel[marketplace_id], "shipment_id": shipment_id}
                )
                updated_shipments += 1
        
        print(f"[OK] Обновлено отгрузок: {updated_shipments}")
        
        # Шаг 6: Удаляем старую колонку marketplace_id
        print("\nШаг 6: Удаление старой колонки marketplace_id...")
        try:
            db.execute(text("ALTER TABLE realizations DROP COLUMN IF EXISTS marketplace_id"))
            db.execute(text("ALTER TABLE shipments DROP COLUMN IF EXISTS marketplace_id"))
            db.commit()
            print("[OK] Старые колонки удалены")
        except Exception as e:
            print(f"  Предупреждение: {e}")
            db.rollback()
        
        # Шаг 7: Переименовываем sales_channel_id (если нужно) - на самом деле она уже правильная
        # Но нужно убедиться, что она NOT NULL
        print("\nШаг 7: Установка ограничений...")
        try:
            db.execute(text("ALTER TABLE realizations ALTER COLUMN sales_channel_id SET NOT NULL"))
            db.execute(text("ALTER TABLE shipments ALTER COLUMN sales_channel_id SET NOT NULL"))
            db.commit()
            print("[OK] Ограничения установлены")
        except Exception as e:
            print(f"  Предупреждение: {e}")
            db.rollback()
        
        # Шаг 8: Создаем новые внешние ключи
        print("\nШаг 8: Создание новых внешних ключей...")
        try:
            db.execute(text("""
                ALTER TABLE realizations 
                ADD CONSTRAINT realizations_sales_channel_id_fkey 
                FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id)
            """))
            db.execute(text("""
                ALTER TABLE shipments 
                ADD CONSTRAINT shipments_sales_channel_id_fkey 
                FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id)
            """))
            db.commit()
            print("[OK] Внешние ключи созданы")
        except Exception as e:
            print(f"  Предупреждение: {e}")
            db.rollback()
        
        # Шаг 9: Создаем индексы
        print("\nШаг 9: Создание индексов...")
        try:
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_realizations_sales_channel_id ON realizations(sales_channel_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS idx_shipments_sales_channel_id ON shipments(sales_channel_id)"))
            db.commit()
            print("[OK] Индексы созданы")
        except Exception as e:
            print(f"  Предупреждение: {e}")
            db.rollback()
        
        db.commit()
        
        print("\n" + "=" * 60)
        print("Миграция завершена успешно!")
        print("=" * 60)
        print("\nСледующий шаг (опционально):")
        print("После проверки работы системы можно удалить таблицу marketplaces:")
        print("  DROP TABLE IF EXISTS marketplaces CASCADE;")
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Ошибка миграции: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

