"""
Миграция: Замена маркетплейсов на каналы продаж
Переносит данные из таблицы marketplaces в sales_channels и обновляет связи
"""
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
        print("Начало миграции: замена маркетплейсов на каналы продаж")
        
        # 1. Получаем все маркетплейсы напрямую из БД
        result = db.execute(text("SELECT id, name, description, is_active FROM marketplaces"))
        marketplaces = result.fetchall()
        print(f"Найдено маркетплейсов: {len(marketplaces)}")
        
        # 2. Создаем каналы продаж из маркетплейсов (если их еще нет)
        marketplace_to_channel = {}
        for mp in marketplaces:
            mp_id, mp_name, mp_description, mp_is_active = mp
            
            # Проверяем, существует ли уже канал с таким именем
            existing_channel = db.query(SalesChannel).filter(
                SalesChannel.name == mp_name
            ).first()
            
            if existing_channel:
                marketplace_to_channel[mp_id] = existing_channel.id
                print(f"  Используем существующий канал: {mp_name} (ID: {existing_channel.id})")
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
                print(f"  Создан новый канал: {mp_name} (ID: {new_channel.id})")
        
        db.commit()
        print(f"Создано/найдено каналов продаж: {len(marketplace_to_channel)}")
        
        # 3. Обновляем таблицу realizations
        result = db.execute(text("SELECT id, marketplace_id FROM realizations WHERE marketplace_id IS NOT NULL"))
        realizations = result.fetchall()
        updated_realizations = 0
        for realization_id, marketplace_id in realizations:
            if marketplace_id in marketplace_to_channel:
                db.execute(
                    text("UPDATE realizations SET marketplace_id = :new_id WHERE id = :realization_id"),
                    {"new_id": marketplace_to_channel[marketplace_id], "realization_id": realization_id}
                )
                updated_realizations += 1
        
        print(f"Обновлено реализаций: {updated_realizations}")
        
        # 4. Обновляем таблицу shipments
        result = db.execute(text("SELECT id, marketplace_id FROM shipments WHERE marketplace_id IS NOT NULL"))
        shipments = result.fetchall()
        updated_shipments = 0
        for shipment_id, marketplace_id in shipments:
            if marketplace_id in marketplace_to_channel:
                db.execute(
                    text("UPDATE shipments SET marketplace_id = :new_id WHERE id = :shipment_id"),
                    {"new_id": marketplace_to_channel[marketplace_id], "shipment_id": shipment_id}
                )
                updated_shipments += 1
        
        print(f"Обновлено отгрузок: {updated_shipments}")
        
        db.commit()
        print("\nМиграция данных завершена успешно!")
        print("\nСледующий шаг: выполните SQL миграцию для переименования колонок")
        print("Файл: backend/migrate_rename_marketplace_to_sales_channel.sql")
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка миграции: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

