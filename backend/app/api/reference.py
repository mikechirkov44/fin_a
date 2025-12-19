from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.reference import IncomeItem, ExpenseItem, PaymentPlace
from app.schemas.reference import (
    IncomeItemCreate, IncomeItemResponse,
    ExpenseItemCreate, ExpenseItemResponse,
    PaymentPlaceCreate, PaymentPlaceResponse
)
from app.auth.security import get_current_user

router = APIRouter()

# Income Items
@router.get("/income-items", response_model=List[IncomeItemResponse])
def get_income_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(IncomeItem).filter(IncomeItem.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/income-items", response_model=IncomeItemResponse)
def create_income_item(item: IncomeItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = IncomeItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/income-items/{item_id}", response_model=IncomeItemResponse)
def update_income_item(item_id: int, item: IncomeItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(IncomeItem).filter(IncomeItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income item not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/income-items/{item_id}")
def delete_income_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(IncomeItem).filter(IncomeItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income item not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Income item deleted"}

# Expense Items
@router.get("/expense-items", response_model=List[ExpenseItemResponse])
def get_expense_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ExpenseItem).filter(ExpenseItem.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/expense-items", response_model=ExpenseItemResponse)
def create_expense_item(item: ExpenseItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = ExpenseItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/expense-items/{item_id}", response_model=ExpenseItemResponse)
def update_expense_item(item_id: int, item: ExpenseItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense item not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/expense-items/{item_id}")
def delete_expense_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseItem).filter(ExpenseItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense item not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Expense item deleted"}

# Payment Places
@router.get("/payment-places", response_model=List[PaymentPlaceResponse])
def get_payment_places(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(PaymentPlace).filter(PaymentPlace.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/payment-places", response_model=PaymentPlaceResponse)
def create_payment_place(item: PaymentPlaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = PaymentPlace(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/payment-places/{item_id}", response_model=PaymentPlaceResponse)
def update_payment_place(item_id: int, item: PaymentPlaceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(PaymentPlace).filter(PaymentPlace.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Payment place not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/payment-places/{item_id}")
def delete_payment_place(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(PaymentPlace).filter(PaymentPlace.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Payment place not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Payment place deleted"}

