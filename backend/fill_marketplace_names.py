"""
Заполнение marketplace_name для существующих записей
"""
from app.database import SessionLocal
from app.models.marketplace_integration import MarketplaceIntegration
from sqlalchemy import text

def fill_marketplace_names():
    db = SessionLocal()
    try:
        # Проверяем, есть ли записи без marketplace_name
        integrations = db.query(MarketplaceIntegration).filter(
            MarketplaceIntegration.marketplace_name == None
        ).all()
        
        if not integrations:
            print("[INFO] Все записи уже имеют marketplace_name")
            return
        
        print(f"[INFO] Найдено {len(integrations)} записей без marketplace_name")
        
        # Пытаемся определить маркетплейс по API ключам
        for integration in integrations:
            marketplace_name = None
            
            # Если есть OZON ключи - это OZON
            if integration.ozon_client_id or integration.ozon_api_key:
                marketplace_name = "OZON"
            # Если есть WB ключи - это Wildberries
            elif integration.wb_api_key:
                marketplace_name = "Wildberries"
            else:
                # По умолчанию ставим OZON
                marketplace_name = "OZON"
            
            integration.marketplace_name = marketplace_name
            print(f"  [OK] ID {integration.id}: установлено '{marketplace_name}'")
        
        db.commit()
        print(f"\n[SUCCESS] Обновлено {len(integrations)} записей")
        
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fill_marketplace_names()

