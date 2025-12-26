from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.models.user import User
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.reference import Company
from app.schemas.inventory import (
    InventoryCreate, InventoryUpdate, InventoryResponse,
    InventoryTransactionCreate, InventoryTransactionResponse
)
from app.auth.security import get_current_user
from app.auth.permissions import filter_by_user_companies, can_write, get_user_companies
from app.services.inventory_service import (
    add_inventory_transaction, get_inventory_balance,
    get_low_stock_alerts, calculate_average_cost
)

router = APIRouter()

@router.get("/", response_model=List[InventoryResponse])
def get_inventory(
    company_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список остатков товаров"""
    query = db.query(Inventory).join(Warehouse)
    
    # Фильтр по организации
    if company_id:
        query = query.filter(Warehouse.company_id == company_id)
        # Проверка доступа
        if current_user.role.value != "ADMIN":
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        # Фильтрация по доступным организациям
        query = filter_by_user_companies(query, current_user, Warehouse.company_id, db)
    
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    
    if product_id:
        query = query.filter(Inventory.product_id == product_id)
    
    inventory_list = query.offset(skip).limit(limit).all()
    
    result = []
    for inv in inventory_list:
        result.append({
            "id": inv.id,
            "product_id": inv.product_id,
            "warehouse_id": inv.warehouse_id,
            "quantity": inv.quantity,
            "min_stock_level": inv.min_stock_level,
            "created_at": inv.created_at,
            "updated_at": inv.updated_at,
            "product_name": inv.product.name if inv.product else None,
            "warehouse_name": inv.warehouse.name if inv.warehouse else None
        })
    
    return result

@router.post("/", response_model=InventoryResponse)
def create_inventory(
    inventory: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать или обновить остаток товара"""
    # Проверка существования склада и доступа
    warehouse = db.query(Warehouse).filter(Warehouse.id == inventory.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if not can_write(current_user, warehouse.company_id, db):
        raise HTTPException(status_code=403, detail="No write access to this company")
    
    # Проверка существования товара
    product = db.query(Product).filter(Product.id == inventory.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Получаем или создаем остаток
    from app.services.inventory_service import get_or_create_inventory
    db_inventory = get_or_create_inventory(inventory.product_id, inventory.warehouse_id, db)
    
    db_inventory.quantity = inventory.quantity
    db_inventory.min_stock_level = inventory.min_stock_level
    
    db.commit()
    db.refresh(db_inventory)
    
    return {
        "id": db_inventory.id,
        "product_id": db_inventory.product_id,
        "warehouse_id": db_inventory.warehouse_id,
        "quantity": db_inventory.quantity,
        "min_stock_level": db_inventory.min_stock_level,
        "created_at": db_inventory.created_at,
        "updated_at": db_inventory.updated_at,
        "product_name": product.name,
        "warehouse_name": warehouse.name
    }

@router.post("/transactions", response_model=InventoryTransactionResponse)
def create_transaction(
    transaction: InventoryTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать транзакцию движения товара"""
    # Проверка существования склада и доступа
    warehouse = db.query(Warehouse).filter(Warehouse.id == transaction.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    if not can_write(current_user, warehouse.company_id, db):
        raise HTTPException(status_code=403, detail="No write access to this company")
    
    # Проверка существования товара
    product = db.query(Product).filter(Product.id == transaction.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Парсим дату
    try:
        transaction_date = datetime.fromisoformat(transaction.date).date()
    except:
        transaction_date = date.today()
    
    # Создаем транзакцию
    db_transaction = add_inventory_transaction(
        transaction_type=transaction.transaction_type,
        product_id=transaction.product_id,
        warehouse_id=transaction.warehouse_id,
        quantity=transaction.quantity,
        cost_price=transaction.cost_price,
        transaction_date=transaction_date,
        db=db,
        batch_number=transaction.batch_number,
        document_type=transaction.document_type,
        document_id=transaction.document_id,
        description=transaction.description,
        created_by=current_user.id
    )
    
    return {
        "id": db_transaction.id,
        "transaction_type": db_transaction.transaction_type,
        "product_id": db_transaction.product_id,
        "warehouse_id": db_transaction.warehouse_id,
        "quantity": db_transaction.quantity,
        "cost_price": db_transaction.cost_price,
        "date": db_transaction.date.isoformat(),
        "batch_number": db_transaction.batch_number,
        "document_type": db_transaction.document_type,
        "document_id": db_transaction.document_id,
        "description": db_transaction.description,
        "created_at": db_transaction.created_at,
        "product_name": product.name,
        "warehouse_name": warehouse.name
    }

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def get_transactions(
    company_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить историю транзакций"""
    query = db.query(InventoryTransaction).join(Warehouse)
    
    # Фильтр по организации
    if company_id:
        query = query.filter(Warehouse.company_id == company_id)
        if current_user.role.value != "ADMIN":
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        query = filter_by_user_companies(query, current_user, Warehouse.company_id, db)
    
    if warehouse_id:
        query = query.filter(InventoryTransaction.warehouse_id == warehouse_id)
    
    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date).date()
            query = query.filter(InventoryTransaction.date >= start)
        except:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date).date()
            query = query.filter(InventoryTransaction.date <= end)
        except:
            pass
    
    transactions = query.order_by(InventoryTransaction.date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for trans in transactions:
        result.append({
            "id": trans.id,
            "transaction_type": trans.transaction_type,
            "product_id": trans.product_id,
            "warehouse_id": trans.warehouse_id,
            "quantity": trans.quantity,
            "cost_price": trans.cost_price,
            "date": trans.date.isoformat(),
            "batch_number": trans.batch_number,
            "document_type": trans.document_type,
            "document_id": trans.document_id,
            "description": trans.description,
            "created_at": trans.created_at,
            "product_name": trans.product.name if trans.product else None,
            "warehouse_name": trans.warehouse.name if trans.warehouse else None
        })
    
    return result

@router.get("/turnover", response_model=List[dict])
def get_turnover_analysis(
    company_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Анализ оборачиваемости товаров"""
    from app.models.realization import Realization
    
    # Фильтр по организации
    if company_id:
        if current_user.role.value != "ADMIN":
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        # Берем первую доступную организацию
        user_companies = get_user_companies(current_user.id, db)
        if not user_companies:
            return []
        company_id = user_companies[0]
    
    # Период анализа (по умолчанию последние 90 дней)
    if not end_date:
        end_date = date.today()
    else:
        try:
            end_date = datetime.fromisoformat(end_date).date()
        except:
            end_date = date.today()
    
    if not start_date:
        start_date = end_date - timedelta(days=90)
    else:
        try:
            start_date = datetime.fromisoformat(start_date).date()
        except:
            start_date = end_date - timedelta(days=90)
    
    # Получаем все товары организации через склады
    warehouses = db.query(Warehouse).filter(
        Warehouse.company_id == company_id,
        Warehouse.is_active == True
    ).all()
    
    warehouse_ids = [w.id for w in warehouses]
    if not warehouse_ids:
        return []
    
    # Получаем остатки товаров
    inventory_items = db.query(Inventory).filter(
        Inventory.warehouse_id.in_(warehouse_ids)
    ).all()
    
    # Группируем по товарам
    product_inventory = {}
    for inv in inventory_items:
        if inv.product_id not in product_inventory:
            product_inventory[inv.product_id] = {
                "product_id": inv.product_id,
                "product_name": inv.product.name if inv.product else None,
                "total_quantity": Decimal('0'),
                "avg_cost": Decimal('0')
            }
        product_inventory[inv.product_id]["total_quantity"] += inv.quantity
    
    # Получаем реализацию за период
    realizations = db.query(Realization).filter(
        Realization.company_id == company_id,
        Realization.date >= start_date,
        Realization.date <= end_date
    ).all()
    
    # Группируем реализацию по товарам
    product_sales = {}
    for real in realizations:
        if real.product_id:
            if real.product_id not in product_sales:
                product_sales[real.product_id] = {
                    "quantity": Decimal('0'),
                    "revenue": Decimal('0'),
                    "cogs": Decimal('0')  # Cost of Goods Sold
                }
            product_sales[real.product_id]["quantity"] += real.quantity
            product_sales[real.product_id]["revenue"] += real.revenue or Decimal('0')
            # Используем среднюю себестоимость для расчета COGS
            avg_cost = calculate_average_cost(real.product_id, warehouse_ids[0], db)
            product_sales[real.product_id]["cogs"] += avg_cost * real.quantity
    
    # Рассчитываем оборачиваемость
    result = []
    for product_id, inv_data in product_inventory.items():
        sales_data = product_sales.get(product_id, {
            "quantity": Decimal('0'),
            "revenue": Decimal('0'),
            "cogs": Decimal('0')
        })
        
        avg_inventory = inv_data["total_quantity"]
        cogs = sales_data["cogs"]
        
        # Коэффициент оборачиваемости = COGS / Средний остаток
        if avg_inventory > 0:
            turnover_ratio = float(cogs / avg_inventory) if cogs > 0 else 0
            days_turnover = 365 / turnover_ratio if turnover_ratio > 0 else 0
        else:
            turnover_ratio = 0
            days_turnover = 0
        
        result.append({
            "product_id": product_id,
            "product_name": inv_data["product_name"],
            "average_inventory": float(avg_inventory),
            "sales_quantity": float(sales_data["quantity"]),
            "sales_revenue": float(sales_data["revenue"]),
            "cogs": float(cogs),
            "turnover_ratio": turnover_ratio,
            "days_turnover": days_turnover
        })
    
    return result

@router.get("/alerts", response_model=List[dict])
def get_stock_alerts(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить алерты на низкие остатки"""
    if company_id:
        if current_user.role.value != "ADMIN":
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        # Получаем алерты для всех доступных организаций
        user_companies = get_user_companies(current_user.id, db)
        if not user_companies:
            return []
        
        all_alerts = []
        for comp_id in user_companies:
            alerts = get_low_stock_alerts(comp_id, db)
            all_alerts.extend(alerts)
        return all_alerts
    
    return get_low_stock_alerts(company_id, db)

