from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.shipment import Shipment
from app.schemas.shipment import ShipmentCreate, ShipmentResponse
from app.schemas.common import PaginatedResponse
from app.auth.security import get_current_user
from app.utils.audit_logger import log_create, log_update, log_delete, model_to_dict

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[ShipmentResponse])
def get_shipments(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    marketplace_id: int | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Shipment)
    
    if start_date:
        query = query.filter(Shipment.date >= start_date)
    if end_date:
        query = query.filter(Shipment.date <= end_date)
    if marketplace_id:
        query = query.filter(Shipment.marketplace_id == marketplace_id)
    if company_id:
        query = query.filter(Shipment.company_id == company_id)
    
    # Получаем общее количество записей
    total = query.count()
    
    # Получаем данные с пагинацией
    shipments = query.order_by(Shipment.date.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": shipments,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=ShipmentResponse)
def create_shipment(
    shipment: ShipmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_shipment = Shipment(**shipment.dict())
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    
    # Логирование создания
    ip_address = request.client.host if request.client else None
    log_create(db, db_shipment, current_user.id,
               description=f"Создана отгрузка: количество {shipment.quantity}, себестоимость {shipment.cost_price}",
               ip_address=ip_address)
    db.commit()  # Коммитим логирование
    
    return db_shipment

@router.put("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    shipment: ShipmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Сохраняем старые значения для логирования
    old_values = model_to_dict(db_shipment, exclude_fields=['created_at', 'updated_at'])
    
    for key, value in shipment.dict().items():
        setattr(db_shipment, key, value)
    db.commit()
    db.refresh(db_shipment)
    
    # Логирование обновления
    ip_address = request.client.host if request.client else None
    log_update(db, db_shipment, current_user.id,
               old_values=old_values,
               description=f"Обновлена отгрузка ID: {shipment_id}",
               ip_address=ip_address)
    db.commit()  # Коммитим логирование
    
    return db_shipment

@router.delete("/{shipment_id}")
def delete_shipment(
    shipment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Логирование удаления (до удаления из БД)
    ip_address = request.client.host if request.client else None
    log_delete(db, db_shipment, current_user.id,
               description=f"Удалена отгрузка ID: {shipment_id}",
               ip_address=ip_address)
    
    db.delete(db_shipment)
    db.commit()
    return {"message": "Shipment deleted"}

@router.post("/delete-multiple")
def delete_multiple_shipments(
    request: Request,
    ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Групповое удаление отгрузок"""
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Логирование удаления для каждой записи
    ip_address = request.client.host if request.client else None
    shipments = db.query(Shipment).filter(Shipment.id.in_(ids)).all()
    for shipment in shipments:
        log_delete(db, shipment, current_user.id,
                   description=f"Удалена отгрузка ID: {shipment.id}",
                   ip_address=ip_address)
    
    deleted_count = db.query(Shipment).filter(Shipment.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} shipment(s)",
        "deleted_count": deleted_count
    }

