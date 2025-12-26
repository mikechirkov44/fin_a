from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.marketplace_integration import MarketplaceIntegration
from app.models.realization import Realization
from app.models.reference import Marketplace, Company
from app.schemas.marketplace_integration import (
    MarketplaceIntegrationCreate,
    MarketplaceIntegrationUpdate,
    MarketplaceIntegrationResponse,
    SyncRequest,
    SyncResponse
)
from app.auth.security import get_current_user
from app.services.ozon_api import OzonAPI
from app.services.wb_api import WildberriesAPI

router = APIRouter()

@router.get("/", response_model=List[MarketplaceIntegrationResponse])
def get_integrations(
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список интеграций"""
    query = db.query(MarketplaceIntegration)
    if company_id:
        query = query.filter(MarketplaceIntegration.company_id == company_id)
    
    integrations = query.all()
    
    # Скрываем API ключи в ответе
    result = []
    for integration in integrations:
        data = MarketplaceIntegrationResponse.model_validate(integration)
        # Скрываем ключи, показываем только последние 4 символа
        if data.ozon_api_key:
            data.ozon_api_key = "****" + data.ozon_api_key[-4:] if len(data.ozon_api_key) > 4 else "****"
        if data.wb_api_key:
            data.wb_api_key = "****" + data.wb_api_key[-4:] if len(data.wb_api_key) > 4 else "****"
        if data.wb_stat_api_key:
            data.wb_stat_api_key = "****" + data.wb_stat_api_key[-4:] if len(data.wb_stat_api_key) > 4 else "****"
        result.append(data)
    
    return result

@router.post("/", response_model=MarketplaceIntegrationResponse)
def create_integration(
    integration: MarketplaceIntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать или обновить интеграцию"""
    # Проверяем существующую интеграцию
    existing = db.query(MarketplaceIntegration).filter(
        MarketplaceIntegration.marketplace_name == integration.marketplace_name,
        MarketplaceIntegration.company_id == integration.company_id
    ).first()
    
    if existing:
        # Обновляем существующую
        for key, value in integration.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return MarketplaceIntegrationResponse.model_validate(existing)
    else:
        # Создаем новую
        db_integration = MarketplaceIntegration(**integration.dict())
        db.add(db_integration)
        db.commit()
        db.refresh(db_integration)
        return MarketplaceIntegrationResponse.model_validate(db_integration)

@router.put("/{integration_id}", response_model=MarketplaceIntegrationResponse)
def update_integration(
    integration_id: int,
    integration: MarketplaceIntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить интеграцию"""
    db_integration = db.query(MarketplaceIntegration).filter(
        MarketplaceIntegration.id == integration_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Интеграция не найдена")
    
    for key, value in integration.dict(exclude_unset=True).items():
        setattr(db_integration, key, value)
    
    db.commit()
    db.refresh(db_integration)
    return MarketplaceIntegrationResponse.from_orm(db_integration)

@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить интеграцию"""
    db_integration = db.query(MarketplaceIntegration).filter(
        MarketplaceIntegration.id == integration_id
    ).first()
    
    if not db_integration:
        raise HTTPException(status_code=404, detail="Интеграция не найдена")
    
    db.delete(db_integration)
    db.commit()
    return {"message": "Интеграция удалена"}

@router.post("/sync", response_model=SyncResponse)
def sync_marketplace(
    sync_request: SyncRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Синхронизировать данные с маркетплейсом"""
    # Получаем интеграцию по ID
    integration = db.query(MarketplaceIntegration).filter(
        MarketplaceIntegration.id == sync_request.integration_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Интеграция не найдена")
    
    if not integration.is_active:
        raise HTTPException(status_code=400, detail="Интеграция неактивна")
    
    # Определяем даты
    if sync_request.start_date:
        start_date = datetime.fromisoformat(sync_request.start_date).date()
    else:
        start_date = date.today() - timedelta(days=30)  # По умолчанию последние 30 дней
    
    if sync_request.end_date:
        end_date = datetime.fromisoformat(sync_request.end_date).date()
    else:
        end_date = date.today()
    
    # Обновляем статус
    integration.last_sync_status = "in_progress"
    integration.last_sync_error = None
    db.commit()
    
    # Запускаем синхронизацию в фоне
    background_tasks.add_task(
        perform_sync,
        integration.id,
        integration.marketplace_name.lower(),
        start_date,
        end_date
    )
    
    return SyncResponse(
        success=True,
        message="Синхронизация запущена",
        imported_count=0
    )

def perform_sync(integration_id: int, marketplace_name: str, start_date: date, end_date: date):
    """Выполнить синхронизацию (вызывается в фоне)"""
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        integration = db.query(MarketplaceIntegration).filter(
            MarketplaceIntegration.id == integration_id
        ).first()
        
        if not integration:
            return
        
        sales_data = []
        errors = []
        
        try:
            if "ozon" in marketplace_name.lower():
                if not integration.ozon_client_id or not integration.ozon_api_key:
                    raise Exception("Не указаны учетные данные OZON")
                
                ozon = OzonAPI(integration.ozon_client_id, integration.ozon_api_key)
                sales_data = ozon.get_sales(start_date, end_date)
            
            elif "wildberries" in marketplace_name.lower() or "wb" in marketplace_name.lower():
                if not integration.wb_api_key:
                    raise Exception("Не указан API ключ Wildberries")
                
                wb = WildberriesAPI(integration.wb_api_key, integration.wb_stat_api_key)
                # Пробуем получить продажи
                try:
                    sales_data = wb.get_sales(start_date, end_date)
                except Exception as e:
                    # Если не получилось, пробуем заказы
                    try:
                        sales_data = wb.get_orders(start_date, end_date)
                    except Exception as e2:
                        raise Exception(f"Не удалось получить данные: {str(e)}; {str(e2)}")
            
            # Находим или создаем маркетплейс в справочнике
            marketplace = db.query(Marketplace).filter(
                Marketplace.name.ilike(f"%{integration.marketplace_name}%")
            ).first()
            
            if not marketplace:
                # Создаем маркетплейс в справочнике, если его нет
                marketplace = Marketplace(
                    name=integration.marketplace_name,
                    description=f"Автоматически создан из интеграции",
                    is_active=True
                )
                db.add(marketplace)
                db.commit()
                db.refresh(marketplace)
            
            # Сохраняем данные о реализациях
            imported = 0
            
            for sale in sales_data:
                try:
                    # Проверяем, нет ли уже такой записи
                    existing = db.query(Realization).filter(
                        Realization.date == sale["date"],
                        Realization.marketplace_id == marketplace.id,
                        Realization.company_id == integration.company_id,
                        Realization.revenue == sale["revenue"]
                    ).first()
                    
                    if existing:
                        continue
                    
                    # SQLAlchemy автоматически конвертирует float в Numeric
                    realization = Realization(
                        date=sale["date"],
                        marketplace_id=marketplace.id,
                        company_id=integration.company_id,
                        revenue=float(sale["revenue"]),
                        quantity=sale.get("quantity", 1),
                        description=sale.get("description", f"Синхронизация с {integration.marketplace_name}")
                    )
                    db.add(realization)
                    imported += 1
                except Exception as e:
                    errors.append(f"Ошибка при сохранении записи: {str(e)}")
            
            db.commit()
            
            # Обновляем статус
            integration.last_sync_at = datetime.now()
            integration.last_sync_status = "success" if not errors else "error"
            if errors:
                # Ограничиваем количество ошибок в сообщении
                error_msg = "; ".join(errors[:5])
                if len(errors) > 5:
                    error_msg += f" ... и еще {len(errors) - 5} ошибок"
                integration.last_sync_error = error_msg
            else:
                integration.last_sync_error = None
            db.commit()
            
            print(f"[SYNC] Синхронизация завершена. Импортировано: {imported}, Ошибок: {len(errors)}")
            
        except Exception as e:
            integration.last_sync_status = "error"
            integration.last_sync_error = str(e)
            db.commit()
            raise
    
    finally:
        db.close()

@router.post("/test-connection")
def test_connection(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Проверить подключение к API маркетплейса"""
    integration = db.query(MarketplaceIntegration).filter(
        MarketplaceIntegration.id == integration_id
    ).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Интеграция не найдена")
    
    marketplace_name = integration.marketplace_name.lower()
    
    try:
        if "ozon" in marketplace_name:
            if not integration.ozon_client_id or not integration.ozon_api_key:
                return {"success": False, "message": "Не указаны учетные данные OZON"}
            
            ozon = OzonAPI(integration.ozon_client_id, integration.ozon_api_key)
            is_connected = ozon.test_connection()
            return {"success": is_connected, "message": "Подключение успешно" if is_connected else "Ошибка подключения"}
        
        elif "wildberries" in marketplace_name or "wb" in marketplace_name:
            if not integration.wb_api_key:
                return {"success": False, "message": "Не указан API ключ Wildberries"}
            
            wb = WildberriesAPI(integration.wb_api_key, integration.wb_stat_api_key)
            is_connected = wb.test_connection()
            return {"success": is_connected, "message": "Подключение успешно" if is_connected else "Ошибка подключения"}
        
        return {"success": False, "message": "Неподдерживаемый маркетплейс"}
    
    except Exception as e:
        return {"success": False, "message": f"Ошибка: {str(e)}"}

