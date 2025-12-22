"""
Скрипт миграции для добавления компаний и маркетплейсов
- Создает дефолтную компанию
- Создает маркетплейсы из существующих данных
- Привязывает все операции к дефолтной компании
- Обновляет Realization и Shipment, заменяя строковые marketplace на marketplace_id
"""
import sys
from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.reference import Company, Marketplace
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.models.input2 import Asset, Liability

def migrate():
    db = SessionLocal()
    try:
        print("Начало миграции...")
        
        # 1. Создаем дефолтную компанию, если её нет
        default_company = db.query(Company).filter(Company.name == "Основная организация").first()
        if not default_company:
            default_company = Company(name="Основная организация", description="Организация по умолчанию")
            db.add(default_company)
            db.commit()
            db.refresh(default_company)
            print(f"Создана дефолтная компания: {default_company.id}")
        else:
            print(f"Используется существующая компания: {default_company.id}")
        
        # 2. Получаем все уникальные маркетплейсы из Realization (через raw SQL, т.к. колонки еще не добавлены)
        try:
            result = db.execute(text("SELECT DISTINCT marketplace FROM realizations WHERE marketplace IS NOT NULL"))
            marketplace_names = {row[0] for row in result if row[0]}
        except Exception as e:
            print(f"Ошибка при чтении маркетплейсов из realizations: {e}")
            marketplace_names = set()
        
        # Получаем все уникальные маркетплейсы из Shipment
        try:
            result = db.execute(text("SELECT DISTINCT marketplace FROM shipments WHERE marketplace IS NOT NULL"))
            for row in result:
                if row[0]:
                    marketplace_names.add(row[0])
        except Exception as e:
            print(f"Ошибка при чтении маркетплейсов из shipments: {e}")
        
        # Создаем маркетплейсы
        marketplace_map = {}
        for name in marketplace_names:
            marketplace = db.query(Marketplace).filter(Marketplace.name == name).first()
            if not marketplace:
                marketplace = Marketplace(name=name, description=f"Маркетплейс {name}")
                db.add(marketplace)
                db.commit()
                db.refresh(marketplace)
                print(f"Создан маркетплейс: {marketplace.name} (id: {marketplace.id})")
            marketplace_map[name] = marketplace.id
        
        # 3. Добавляем company_id в MoneyMovement (если колонка еще не существует)
        try:
            # Проверяем, существует ли колонка company_id
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='money_movements' AND column_name='company_id'
            """))
            if not result.fetchone():
                print("Добавление колонки company_id в money_movements...")
                db.execute(text("ALTER TABLE money_movements ADD COLUMN company_id INTEGER"))
                db.execute(text("ALTER TABLE money_movements ADD CONSTRAINT fk_money_movements_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
                db.commit()
            
            # Обновляем все записи
            db.execute(text(f"UPDATE money_movements SET company_id = {default_company.id} WHERE company_id IS NULL"))
            db.commit()
            print("Обновлены записи MoneyMovement")
        except Exception as e:
            print(f"Ошибка при обновлении MoneyMovement: {e}")
            db.rollback()
        
        # 4. Добавляем company_id и marketplace_id в Realization
        try:
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='realizations' AND column_name='company_id'
            """))
            if not result.fetchone():
                print("Добавление колонок в realizations...")
                db.execute(text("ALTER TABLE realizations ADD COLUMN company_id INTEGER"))
                db.execute(text("ALTER TABLE realizations ADD COLUMN marketplace_id INTEGER"))
                db.execute(text("ALTER TABLE realizations ADD CONSTRAINT fk_realizations_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
                db.execute(text("ALTER TABLE realizations ADD CONSTRAINT fk_realizations_marketplace FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id)"))
                db.commit()
            
            # Обновляем записи (через raw SQL)
            try:
                for marketplace_name, marketplace_id in marketplace_map.items():
                    db.execute(text(f"""
                        UPDATE realizations 
                        SET company_id = {default_company.id}, 
                            marketplace_id = {marketplace_id}
                        WHERE marketplace = :marketplace_name
                    """), {"marketplace_name": marketplace_name})
                db.commit()
            except Exception as e:
                print(f"Ошибка при обновлении realizations: {e}")
                db.rollback()
            db.commit()
            print("Обновлены записи Realization")
        except Exception as e:
            print(f"Ошибка при обновлении Realization: {e}")
            db.rollback()
        
        # 5. Добавляем company_id и marketplace_id в Shipment
        try:
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='shipments' AND column_name='company_id'
            """))
            if not result.fetchone():
                print("Добавление колонок в shipments...")
                db.execute(text("ALTER TABLE shipments ADD COLUMN company_id INTEGER"))
                db.execute(text("ALTER TABLE shipments ADD COLUMN marketplace_id INTEGER"))
                db.execute(text("ALTER TABLE shipments ADD CONSTRAINT fk_shipments_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
                db.execute(text("ALTER TABLE shipments ADD CONSTRAINT fk_shipments_marketplace FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id)"))
                db.commit()
            
            # Обновляем записи (через raw SQL)
            try:
                for marketplace_name, marketplace_id in marketplace_map.items():
                    db.execute(text(f"""
                        UPDATE shipments 
                        SET company_id = {default_company.id}, 
                            marketplace_id = {marketplace_id}
                        WHERE marketplace = :marketplace_name
                    """), {"marketplace_name": marketplace_name})
                db.commit()
            except Exception as e:
                print(f"Ошибка при обновлении shipments: {e}")
                db.rollback()
            db.commit()
            print("Обновлены записи Shipment")
        except Exception as e:
            print(f"Ошибка при обновлении Shipment: {e}")
            db.rollback()
        
        # 6. Добавляем company_id в Asset
        try:
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='assets' AND column_name='company_id'
            """))
            if not result.fetchone():
                print("Добавление колонки company_id в assets...")
                db.execute(text("ALTER TABLE assets ADD COLUMN company_id INTEGER"))
                db.execute(text("ALTER TABLE assets ADD CONSTRAINT fk_assets_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
                db.commit()
            
            db.execute(text(f"UPDATE assets SET company_id = {default_company.id} WHERE company_id IS NULL"))
            db.commit()
            print("Обновлены записи Asset")
        except Exception as e:
            print(f"Ошибка при обновлении Asset: {e}")
            db.rollback()
        
        # 7. Добавляем company_id в Liability
        try:
            result = db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='liabilities' AND column_name='company_id'
            """))
            if not result.fetchone():
                print("Добавление колонки company_id в liabilities...")
                db.execute(text("ALTER TABLE liabilities ADD COLUMN company_id INTEGER"))
                db.execute(text("ALTER TABLE liabilities ADD CONSTRAINT fk_liabilities_company FOREIGN KEY (company_id) REFERENCES companies(id)"))
                db.commit()
            
            db.execute(text(f"UPDATE liabilities SET company_id = {default_company.id} WHERE company_id IS NULL"))
            db.commit()
            print("Обновлены записи Liability")
        except Exception as e:
            print(f"Ошибка при обновлении Liability: {e}")
            db.rollback()
        
        print("Миграция завершена успешно!")
        
    except Exception as e:
        print(f"Ошибка миграции: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
