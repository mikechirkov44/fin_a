from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.reference import (
    IncomeGroup, IncomeItem, 
    ExpenseGroup, ExpenseItem, 
    PaymentPlace, Company,
    ExpenseCategory, SalesChannel
)
from app.models.input1 import MoneyMovement
from app.schemas.reference import (
    IncomeGroupCreate, IncomeGroupResponse,
    IncomeItemCreate, IncomeItemResponse,
    ExpenseGroupCreate, ExpenseGroupResponse,
    ExpenseItemCreate, ExpenseItemResponse,
    PaymentPlaceCreate, PaymentPlaceResponse,
    CompanyCreate, CompanyResponse,
    ExpenseCategoryCreate, ExpenseCategoryResponse,
    SalesChannelCreate, SalesChannelResponse
)
from app.auth.security import get_current_user
from app.auth.permissions import filter_by_user_companies, get_user_companies

router = APIRouter()

# Income Groups
@router.get("/income-groups", response_model=List[IncomeGroupResponse])
def get_income_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(IncomeGroup).filter(IncomeGroup.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/income-groups", response_model=IncomeGroupResponse)
def create_income_group(item: IncomeGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = IncomeGroup(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/income-groups/{item_id}", response_model=IncomeGroupResponse)
def update_income_group(item_id: int, item: IncomeGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(IncomeGroup).filter(IncomeGroup.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income group not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/income-groups/{item_id}")
def delete_income_group(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(IncomeGroup).filter(IncomeGroup.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Income group not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Income group deleted"}

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

# Expense Groups
@router.get("/expense-groups", response_model=List[ExpenseGroupResponse])
def get_expense_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ExpenseGroup).filter(ExpenseGroup.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/expense-groups", response_model=ExpenseGroupResponse)
def create_expense_group(item: ExpenseGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = ExpenseGroup(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/expense-groups/{item_id}", response_model=ExpenseGroupResponse)
def update_expense_group(item_id: int, item: ExpenseGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseGroup).filter(ExpenseGroup.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense group not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/expense-groups/{item_id}")
def delete_expense_group(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseGroup).filter(ExpenseGroup.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense group not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Expense group deleted"}

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

# Companies
@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Company).filter(Company.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/companies", response_model=CompanyResponse)
def create_company(item: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = Company(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/companies/{item_id}", response_model=CompanyResponse)
def update_company(item_id: int, item: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(Company).filter(Company.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Company not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/companies/{item_id}")
def delete_company(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(Company).filter(Company.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Company not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Company deleted"}

# Expense Categories
@router.get("/expense-categories", response_model=List[ExpenseCategoryResponse])
def get_expense_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ExpenseCategory).filter(ExpenseCategory.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/expense-categories", response_model=ExpenseCategoryResponse)
def create_expense_category(item: ExpenseCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = ExpenseCategory(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/expense-categories/{item_id}", response_model=ExpenseCategoryResponse)
def update_expense_category(item_id: int, item: ExpenseCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseCategory).filter(ExpenseCategory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense category not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/expense-categories/{item_id}")
def delete_expense_category(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(ExpenseCategory).filter(ExpenseCategory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Expense category not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Expense category deleted"}

# Sales Channels
@router.get("/sales-channels", response_model=List[SalesChannelResponse])
def get_sales_channels(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(SalesChannel).filter(SalesChannel.is_active == True).offset(skip).limit(limit).all()
    return items

@router.post("/sales-channels", response_model=SalesChannelResponse)
def create_sales_channel(item: SalesChannelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = SalesChannel(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/sales-channels/{item_id}", response_model=SalesChannelResponse)
def update_sales_channel(item_id: int, item: SalesChannelCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(SalesChannel).filter(SalesChannel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Sales channel not found")
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/sales-channels/{item_id}")
def delete_sales_channel(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_item = db.query(SalesChannel).filter(SalesChannel.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Sales channel not found")
    db_item.is_active = False
    db.commit()
    return {"message": "Sales channel deleted"}

@router.get("/expense-analysis")
def get_expense_analysis(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    company_id: Optional[int] = Query(None),
    group_by: str = Query("item", regex="^(item|group)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Анализ расходов по статьям"""
    if not start_date:
        end_date = end_date or date.today()
        start_date = end_date - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    # Фильтр по организации
    query = db.query(
        MoneyMovement.expense_item_id,
        func.sum(MoneyMovement.amount).label('total')
    ).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True
    )
    
    if company_id:
        query = query.filter(MoneyMovement.company_id == company_id)
        # Проверка доступа
        if current_user.role != UserRole.ADMIN:
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        # Фильтрация по доступным организациям пользователя
        query = filter_by_user_companies(query, current_user, MoneyMovement.company_id, db)
    
    expense_data = query.group_by(MoneyMovement.expense_item_id).all()
    
    result = []
    
    if group_by == "item":
        # Группировка по статьям
        for expense_item_id, total in expense_data:
            if not expense_item_id:
                continue
            item = db.query(ExpenseItem).filter(ExpenseItem.id == expense_item_id).first()
            if item:
                group_name = None
                if item.group_id:
                    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == item.group_id).first()
                    group_name = group.name if group else None
                result.append({
                    "id": item.id,
                    "name": item.name,
                    "group_id": item.group_id,
                    "group_name": group_name,
                    "amount": float(total)
                })
    else:
        # Группировка по группам
        group_totals = {}
        for expense_item_id, total in expense_data:
            if not expense_item_id:
                continue
            item = db.query(ExpenseItem).filter(ExpenseItem.id == expense_item_id).first()
            if item and item.group_id:
                if item.group_id not in group_totals:
                    group = db.query(ExpenseGroup).filter(ExpenseGroup.id == item.group_id).first()
                    group_totals[item.group_id] = {
                        "id": item.group_id,
                        "name": group.name if group else f"Группа #{item.group_id}",
                        "amount": 0
                    }
                group_totals[item.group_id]["amount"] += float(total)
        
        result = list(group_totals.values())
    
    # Сортируем по сумме (убывание)
    result.sort(key=lambda x: x["amount"], reverse=True)
    
    return result
