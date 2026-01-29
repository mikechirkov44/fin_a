from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from decimal import Decimal
from app.database import get_db
from app.models.user import User
from app.models.realization import Realization, RealizationItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.warehouse import Warehouse
from app.schemas.realization import RealizationCreate, RealizationResponse, RealizationItemResponse
from app.schemas.common import PaginatedResponse
from app.auth.security import get_current_user
from app.utils.audit_logger import log_create, log_update, log_delete, model_to_dict
from app.services.inventory_service import add_inventory_transaction

router = APIRouter()

def build_realization_response(realization: Realization) -> dict:
    """Строит ответ с детализацией товаров"""
    items_data = []
    for item in realization.items:
        items_data.append({
            "id": item.id,
            "realization_id": item.realization_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "price": item.price,
            "cost_price": item.cost_price,
            "created_at": item.created_at,
            "product_name": item.product.name if item.product else None
        })
    
    return {
        "id": realization.id,
        "date": realization.date,
        "company_id": realization.company_id,
        "sales_channel_id": realization.sales_channel_id,
        "customer_id": realization.customer_id if realization.customer_id else None,
        "warehouse_id": realization.warehouse_id if realization.warehouse_id else None,
        "revenue": realization.revenue,
        "quantity": realization.quantity,
        "description": realization.description,
        "created_at": realization.created_at,
        "customer_name": realization.customer.name if realization.customer else None,
        "warehouse_name": realization.warehouse.name if realization.warehouse else None,
        "items": items_data
    }

@router.get("/", response_model=PaginatedResponse[RealizationResponse])
def get_realizations(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    sales_channel_id: int | None = Query(None),
    company_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Используем outerjoin для корректной обработки NULL значений в customer_id и warehouse_id
    from sqlalchemy.orm import outerjoin
    query = db.query(Realization).options(
        joinedload(Realization.items).joinedload(RealizationItem.product),
        joinedload(Realization.customer),
        joinedload(Realization.warehouse)
    ).outerjoin(Realization.customer).outerjoin(Realization.warehouse)
    
    if start_date:
        query = query.filter(Realization.date >= start_date)
    if end_date:
        query = query.filter(Realization.date <= end_date)
    if sales_channel_id:
        query = query.filter(Realization.sales_channel_id == sales_channel_id)
    if company_id:
        query = query.filter(Realization.company_id == company_id)
    if warehouse_id:
        query = query.filter(Realization.warehouse_id == warehouse_id)
    
    # Получаем общее количество записей
    total = query.count()
    
    # Получаем данные с пагинацией
    realizations = query.order_by(Realization.date.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": [build_realization_response(r) for r in realizations],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=RealizationResponse)
def create_realization(
    realization: RealizationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Валидация: должен быть хотя бы один товар
    if not realization.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
    # Проверяем существование клиента
    customer = db.query(Customer).filter(Customer.id == realization.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer with id {realization.customer_id} not found")
    
    # Проверяем существование склада
    warehouse = db.query(Warehouse).filter(Warehouse.id == realization.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail=f"Warehouse with id {realization.warehouse_id} not found")
    
    # Вычисляем общую выручку и количество из items
    total_revenue = Decimal('0')
    total_quantity = 0
    
    # Проверяем существование товаров
    product_ids = [item.product_id for item in realization.items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    existing_product_ids = {p.id for p in products}
    
    for item in realization.items:
        if item.product_id not in existing_product_ids:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")
        total_revenue += item.price * Decimal(item.quantity)
        total_quantity += item.quantity
    
    # Создаем реализацию
    db_realization = Realization(
        date=realization.date,
        company_id=realization.company_id,
        sales_channel_id=realization.sales_channel_id,
        customer_id=realization.customer_id,
        warehouse_id=realization.warehouse_id,
        revenue=total_revenue,
        quantity=total_quantity,
        description=realization.description
    )
    db.add(db_realization)
    db.flush()  # Получаем id реализации
    
    # Создаем детализацию товаров и автоматически списываем товары со склада
    for item in realization.items:
        db_item = RealizationItem(
            realization_id=db_realization.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            cost_price=item.cost_price
        )
        db.add(db_item)
        
        # Автоматическое списание товаров со склада
        try:
            add_inventory_transaction(
                transaction_type="OUTCOME",
                product_id=item.product_id,
                warehouse_id=realization.warehouse_id,
                quantity=Decimal(item.quantity),
                cost_price=item.cost_price,
                transaction_date=realization.date,
                db=db,
                document_type="REALIZATION",
                document_id=db_realization.id,
                description=f"Списание по реализации #{db_realization.id}",
                created_by=current_user.id
            )
        except ValueError as e:
            # Откатываем транзакцию, если недостаточно товара на складе
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    db.refresh(db_realization)
    
    # Логирование создания
    ip_address = request.client.host if request.client else None
    log_create(db, db_realization, current_user.id,
               description=f"Создана реализация: выручка {total_revenue}, количество {total_quantity}",
               ip_address=ip_address)
    db.commit()  # Коммитим логирование
    
    # Загружаем связанные данные для ответа
    db_realization = db.query(Realization).options(
        joinedload(Realization.items).joinedload(RealizationItem.product),
        joinedload(Realization.customer),
        joinedload(Realization.warehouse)
    ).filter(Realization.id == db_realization.id).first()
    
    return build_realization_response(db_realization)

@router.put("/{realization_id}", response_model=RealizationResponse)
def update_realization(
    realization_id: int,
    realization: RealizationCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    
    # Сохраняем старые значения для логирования
    old_values = model_to_dict(db_realization, exclude_fields=['created_at', 'updated_at'])
    
    # Валидация: должен быть хотя бы один товар
    if not realization.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
    # Проверяем существование клиента
    customer = db.query(Customer).filter(Customer.id == realization.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer with id {realization.customer_id} not found")
    
    # Проверяем существование склада
    warehouse = db.query(Warehouse).filter(Warehouse.id == realization.warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail=f"Warehouse with id {realization.warehouse_id} not found")
    
    # Вычисляем общую выручку и количество из items
    total_revenue = Decimal('0')
    total_quantity = 0
    
    # Проверяем существование товаров
    product_ids = [item.product_id for item in realization.items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    existing_product_ids = {p.id for p in products}
    
    for item in realization.items:
        if item.product_id not in existing_product_ids:
            raise HTTPException(status_code=404, detail=f"Product with id {item.product_id} not found")
        total_revenue += item.price * Decimal(item.quantity)
        total_quantity += item.quantity
    
    # Удаляем старые транзакции списания (если они были)
    from app.models.inventory_transaction import InventoryTransaction
    db.query(InventoryTransaction).filter(
        InventoryTransaction.document_type == "REALIZATION",
        InventoryTransaction.document_id == realization_id
    ).delete()
    
    # Обновляем основные поля реализации
    db_realization.date = realization.date
    db_realization.company_id = realization.company_id
    db_realization.sales_channel_id = realization.sales_channel_id
    db_realization.customer_id = realization.customer_id
    db_realization.warehouse_id = realization.warehouse_id
    db_realization.revenue = total_revenue
    db_realization.quantity = total_quantity
    db_realization.description = realization.description
    
    # Удаляем старые items (cascade это сделает автоматически, но лучше явно)
    db.query(RealizationItem).filter(RealizationItem.realization_id == realization_id).delete()
    
    # Создаем новые items и автоматически списываем товары со склада
    for item in realization.items:
        db_item = RealizationItem(
            realization_id=realization_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            cost_price=item.cost_price
        )
        db.add(db_item)
        
        # Автоматическое списание товаров со склада
        try:
            add_inventory_transaction(
                transaction_type="OUTCOME",
                product_id=item.product_id,
                warehouse_id=realization.warehouse_id,
                quantity=Decimal(item.quantity),
                cost_price=item.cost_price,
                transaction_date=realization.date,
                db=db,
                document_type="REALIZATION",
                document_id=realization_id,
                description=f"Списание по реализации #{realization_id}",
                created_by=current_user.id
            )
        except ValueError as e:
            # Откатываем транзакцию, если недостаточно товара на складе
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
    
    db.commit()
    
    # Логирование обновления
    ip_address = request.client.host if request.client else None
    log_update(db, db_realization, current_user.id,
               old_values=old_values,
               description=f"Обновлена реализация ID: {realization_id}",
               ip_address=ip_address)
    db.commit()  # Коммитим логирование
    
    # Загружаем связанные данные для ответа
    db_realization = db.query(Realization).options(
        joinedload(Realization.items).joinedload(RealizationItem.product),
        joinedload(Realization.customer),
        joinedload(Realization.warehouse)
    ).filter(Realization.id == realization_id).first()
    
    return build_realization_response(db_realization)

@router.delete("/{realization_id}")
def delete_realization(
    realization_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    
    # Логирование удаления (до удаления из БД)
    ip_address = request.client.host if request.client else None
    log_delete(db, db_realization, current_user.id,
               description=f"Удалена реализация ID: {realization_id}",
               ip_address=ip_address)
    
    db.delete(db_realization)
    db.commit()
    return {"message": "Realization deleted"}

@router.post("/delete-multiple")
def delete_multiple_realizations(
    request: Request,
    ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Групповое удаление реализаций"""
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Логирование удаления для каждой записи
    ip_address = request.client.host if request.client else None
    realizations = db.query(Realization).filter(Realization.id.in_(ids)).all()
    for realization in realizations:
        log_delete(db, realization, current_user.id,
                   description=f"Удалена реализация ID: {realization.id}",
                   ip_address=ip_address)
    
    deleted_count = db.query(Realization).filter(Realization.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} realization(s)",
        "deleted_count": deleted_count
    }

