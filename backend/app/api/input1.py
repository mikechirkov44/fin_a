from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.schemas.input1 import MoneyMovementCreate, MoneyMovementResponse
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[MoneyMovementResponse])
def get_money_movements(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    movement_type: str | None = Query(None),
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
    
    movements = query.order_by(MoneyMovement.date.desc()).offset(skip).limit(limit).all()
    return movements

@router.post("/", response_model=MoneyMovementResponse)
def create_money_movement(
    movement: MoneyMovementCreate,
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
    return db_movement

@router.put("/{movement_id}", response_model=MoneyMovementResponse)
def update_money_movement(
    movement_id: int,
    movement: MoneyMovementCreate,
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
    
    for key, value in movement.dict().items():
        setattr(db_movement, key, value)
    db.commit()
    db.refresh(db_movement)
    return db_movement

@router.delete("/{movement_id}")
def delete_money_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_movement = db.query(MoneyMovement).filter(MoneyMovement.id == movement_id).first()
    if not db_movement:
        raise HTTPException(status_code=404, detail="Money movement not found")
    db.delete(db_movement)
    db.commit()
    return {"message": "Money movement deleted"}

