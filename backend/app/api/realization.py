from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date
from decimal import Decimal
from app.database import get_db
from app.models.user import User
from app.models.realization import Realization, RealizationItem
from app.models.product import Product
from app.schemas.realization import RealizationCreate, RealizationResponse, RealizationItemResponse
from app.auth.security import get_current_user

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
        "marketplace_id": realization.marketplace_id,
        "revenue": realization.revenue,
        "quantity": realization.quantity,
        "description": realization.description,
        "created_at": realization.created_at,
        "items": items_data
    }

@router.get("/", response_model=List[RealizationResponse])
def get_realizations(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    marketplace_id: int | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Realization).options(joinedload(Realization.items).joinedload(RealizationItem.product))
    
    if start_date:
        query = query.filter(Realization.date >= start_date)
    if end_date:
        query = query.filter(Realization.date <= end_date)
    if marketplace_id:
        query = query.filter(Realization.marketplace_id == marketplace_id)
    if company_id:
        query = query.filter(Realization.company_id == company_id)
    
    realizations = query.order_by(Realization.date.desc()).offset(skip).limit(limit).all()
    return [build_realization_response(r) for r in realizations]

@router.post("/", response_model=RealizationResponse)
def create_realization(
    realization: RealizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Валидация: должен быть хотя бы один товар
    if not realization.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
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
        marketplace_id=realization.marketplace_id,
        revenue=total_revenue,
        quantity=total_quantity,
        description=realization.description
    )
    db.add(db_realization)
    db.flush()  # Получаем id реализации
    
    # Создаем детализацию товаров
    for item in realization.items:
        db_item = RealizationItem(
            realization_id=db_realization.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            cost_price=item.cost_price
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_realization)
    
    # Загружаем связанные данные для ответа
    db_realization = db.query(Realization).options(
        joinedload(Realization.items).joinedload(RealizationItem.product)
    ).filter(Realization.id == db_realization.id).first()
    
    return build_realization_response(db_realization)

@router.put("/{realization_id}", response_model=RealizationResponse)
def update_realization(
    realization_id: int,
    realization: RealizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    
    # Валидация: должен быть хотя бы один товар
    if not realization.items:
        raise HTTPException(status_code=400, detail="At least one item is required")
    
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
    
    # Обновляем основные поля реализации
    db_realization.date = realization.date
    db_realization.company_id = realization.company_id
    db_realization.marketplace_id = realization.marketplace_id
    db_realization.revenue = total_revenue
    db_realization.quantity = total_quantity
    db_realization.description = realization.description
    
    # Удаляем старые items (cascade это сделает автоматически, но лучше явно)
    db.query(RealizationItem).filter(RealizationItem.realization_id == realization_id).delete()
    
    # Создаем новые items
    for item in realization.items:
        db_item = RealizationItem(
            realization_id=realization_id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price,
            cost_price=item.cost_price
        )
        db.add(db_item)
    
    db.commit()
    
    # Загружаем связанные данные для ответа
    db_realization = db.query(Realization).options(
        joinedload(Realization.items).joinedload(RealizationItem.product)
    ).filter(Realization.id == realization_id).first()
    
    return build_realization_response(db_realization)

@router.delete("/{realization_id}")
def delete_realization(
    realization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    db.delete(db_realization)
    db.commit()
    return {"message": "Realization deleted"}

