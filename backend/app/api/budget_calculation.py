"""
API для автоматического расчета фактических сумм бюджета
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.budget import Budget, BudgetType, BudgetPeriod
from app.models.input1 import MoneyMovement
from app.auth.security import get_current_user

router = APIRouter()

def _get_period_dates(period_type: BudgetPeriod, period_value: str) -> tuple[date, date]:
    """Преобразует период в начальную и конечную даты"""
    if period_type == BudgetPeriod.MONTH:
        year, month = map(int, period_value.split('-'))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        end_date = date(end_date.year, end_date.month, 1) - date.resolution
    elif period_type == BudgetPeriod.QUARTER:
        year, quarter = period_value.split('-Q')
        year = int(year)
        quarter = int(quarter)
        start_month = (quarter - 1) * 3 + 1
        start_date = date(year, start_month, 1)
        if quarter == 4:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, start_month + 3, 1)
        end_date = date(end_date.year, end_date.month, 1) - date.resolution
    else:  # YEAR
        year = int(period_value)
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    
    return start_date, end_date

@router.post("/calculate-actuals")
def calculate_actual_amounts(
    budget_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    period_value: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Рассчитать и обновить фактические суммы для бюджетов"""
    query = db.query(Budget)
    
    if budget_id:
        query = query.filter(Budget.id == budget_id)
    if company_id:
        query = query.filter(Budget.company_id == company_id)
    if period_value:
        query = query.filter(Budget.period_value == period_value)
    
    budgets = query.all()
    updated_count = 0
    
    for budget in budgets:
        try:
            # Определяем период для факта
            start_date, end_date = _get_period_dates(budget.period_type, budget.period_value)
            
            # Получаем фактические данные
            actual_query = db.query(func.coalesce(func.sum(MoneyMovement.amount), 0))
            
            if budget.budget_type == BudgetType.INCOME:
                actual_query = actual_query.filter(
                    and_(
                        MoneyMovement.movement_type == "income",
                        MoneyMovement.company_id == budget.company_id,
                        MoneyMovement.date >= start_date,
                        MoneyMovement.date <= end_date
                    )
                )
                if budget.income_item_id:
                    actual_query = actual_query.filter(MoneyMovement.income_item_id == budget.income_item_id)
            else:  # EXPENSE
                actual_query = actual_query.filter(
                    and_(
                        MoneyMovement.movement_type == "expense",
                        MoneyMovement.company_id == budget.company_id,
                        MoneyMovement.date >= start_date,
                        MoneyMovement.date <= end_date
                    )
                )
                if budget.expense_item_id:
                    actual_query = actual_query.filter(MoneyMovement.expense_item_id == budget.expense_item_id)
            
            actual_amount = actual_query.scalar() or 0
            budget.actual_amount = actual_amount
            updated_count += 1
        except Exception as e:
            # Логируем ошибку, но продолжаем обработку других бюджетов
            print(f"Error calculating actual for budget {budget.id}: {e}")
            continue
    
    db.commit()
    return {
        "message": f"Updated {updated_count} budgets",
        "updated_count": updated_count
    }

