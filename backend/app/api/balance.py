from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input2 import Asset, Liability
from app.models.input1 import MoneyMovement
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_balance(
    balance_date: date | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Расчет баланса на указанную дату или текущую дату
    """
    if not balance_date:
        balance_date = date.today()
    
    # Активы
    current_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "current",
        Asset.date <= balance_date
    )
    if company_id:
        current_assets_query = current_assets_query.filter(Asset.company_id == company_id)
    current_assets = current_assets_query.scalar() or 0
    
    fixed_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "fixed",
        Asset.date <= balance_date
    )
    if company_id:
        fixed_assets_query = fixed_assets_query.filter(Asset.company_id == company_id)
    fixed_assets = fixed_assets_query.scalar() or 0
    
    intangible_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "intangible",
        Asset.date <= balance_date
    )
    if company_id:
        intangible_assets_query = intangible_assets_query.filter(Asset.company_id == company_id)
    intangible_assets = intangible_assets_query.scalar() or 0
    
    total_assets = float(current_assets) + float(fixed_assets) + float(intangible_assets)
    
    # Обязательства
    short_term_liabilities_query = db.query(func.sum(Liability.value)).filter(
        Liability.category == "short_term",
        Liability.date <= balance_date
    )
    if company_id:
        short_term_liabilities_query = short_term_liabilities_query.filter(Liability.company_id == company_id)
    short_term_liabilities = short_term_liabilities_query.scalar() or 0
    
    long_term_liabilities_query = db.query(func.sum(Liability.value)).filter(
        Liability.category == "long_term",
        Liability.date <= balance_date
    )
    if company_id:
        long_term_liabilities_query = long_term_liabilities_query.filter(Liability.company_id == company_id)
    long_term_liabilities = long_term_liabilities_query.scalar() or 0
    
    total_liabilities = float(short_term_liabilities) + float(long_term_liabilities)
    
    # Капитал (разница между активами и обязательствами)
    equity = total_assets - total_liabilities
    
    # Денежные средства (из движения денег)
    income_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "income",
        MoneyMovement.is_business == True,
        MoneyMovement.date <= balance_date
    )
    if company_id:
        income_query = income_query.filter(MoneyMovement.company_id == company_id)
    total_income = income_query.scalar() or 0
    
    expense_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.is_business == True,
        MoneyMovement.date <= balance_date
    )
    if company_id:
        expense_query = expense_query.filter(MoneyMovement.company_id == company_id)
    total_expense = expense_query.scalar() or 0
    
    cash_balance = float(total_income) - float(total_expense)
    
    return {
        "balance_date": balance_date,
        "assets": {
            "current": float(current_assets),
            "fixed": float(fixed_assets),
            "intangible": float(intangible_assets),
            "total": total_assets
        },
        "liabilities": {
            "short_term": float(short_term_liabilities),
            "long_term": float(long_term_liabilities),
            "total": total_liabilities
        },
        "equity": equity,
        "cash_balance": cash_balance
    }

