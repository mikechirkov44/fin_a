from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.schemas.input1 import MoneyMovementCreate, MoneyMovementResponse
from app.schemas.common import PaginatedResponse
from app.auth.security import get_current_user
from app.utils.audit_logger import log_create, log_update, log_delete

router = APIRouter()

@router.get("/", response_model=PaginatedResponse[MoneyMovementResponse])
def get_money_movements(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    movement_type: str | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MoneyMovement)
    
    if start_date:
        query = query.filter(MoneyMovement.date >= start_date)
    if end_date:
        query = query.filter(MoneyMovement.date <= end_date)
    if movement_type:
        query = query.filter(MoneyMovement.movement_type == movement_type)
    if company_id:
        query = query.filter(MoneyMovement.company_id == company_id)
    
    # Получаем общее количество записей
    total = query.count()
    
    # Получаем данные с пагинацией
    movements = query.order_by(MoneyMovement.date.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": movements,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/", response_model=MoneyMovementResponse)
def create_money_movement(
    movement: MoneyMovementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Валидация: для income должен быть income_item_id, для expense - expense_item_id
    if movement.movement_type == "income" and not movement.income_item_id:
        raise HTTPException(status_code=400, detail="Income item is required for income movement")
    if movement.movement_type == "expense" and not movement.expense_item_id:
        raise HTTPException(status_code=400, detail="Expense item is required for expense movement")
    
    db_movement = MoneyMovement(**movement.dict())
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)
    
    # Логирование создания
    ip_address = request.client.host if request.client else None
    log_create(db, db_movement, current_user.id, 
               description=f"Создано движение денег: {movement.movement_type}, сумма: {movement.amount}",
               ip_address=ip_address)
    
    return db_movement

@router.put("/{movement_id}", response_model=MoneyMovementResponse)
def update_money_movement(
    movement_id: int,
    movement: MoneyMovementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_movement = db.query(MoneyMovement).filter(MoneyMovement.id == movement_id).first()
    if not db_movement:
        raise HTTPException(status_code=404, detail="Money movement not found")
    
    if movement.movement_type == "income" and not movement.income_item_id:
        raise HTTPException(status_code=400, detail="Income item is required for income movement")
    if movement.movement_type == "expense" and not movement.expense_item_id:
        raise HTTPException(status_code=400, detail="Expense item is required for expense movement")
    
    # Сохраняем старые значения для логирования
    from app.utils.audit_logger import model_to_dict
    old_values = model_to_dict(db_movement)
    
    for key, value in movement.dict().items():
        setattr(db_movement, key, value)
    db.commit()
    db.refresh(db_movement)
    
    # Логирование обновления
    ip_address = request.client.host if request.client else None
    log_update(db, db_movement, current_user.id, old_values=old_values,
               description=f"Обновлено движение денег ID: {movement_id}",
               ip_address=ip_address)
    
    return db_movement

@router.delete("/{movement_id}")
def delete_money_movement(
    movement_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_movement = db.query(MoneyMovement).filter(MoneyMovement.id == movement_id).first()
    if not db_movement:
        raise HTTPException(status_code=404, detail="Money movement not found")
    
    # Логирование удаления (до удаления из БД)
    ip_address = request.client.host if request.client else None
    log_delete(db, db_movement, current_user.id,
               description=f"Удалено движение денег ID: {movement_id}",
               ip_address=ip_address)
    
    db.delete(db_movement)
    db.commit()
    return {"message": "Money movement deleted"}

@router.post("/delete-multiple")
def delete_multiple_movements(
    request: Request,
    ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Групповое удаление движений денег"""
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Логирование удаления для каждой записи
    ip_address = request.client.host if request.client else None
    movements = db.query(MoneyMovement).filter(MoneyMovement.id.in_(ids)).all()
    for movement in movements:
        log_delete(db, movement, current_user.id,
                  description=f"Групповое удаление движения денег ID: {movement.id}",
                  ip_address=ip_address)
    
    deleted_count = db.query(MoneyMovement).filter(MoneyMovement.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} movement(s)",
        "deleted_count": deleted_count
    }

