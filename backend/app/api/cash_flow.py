from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_cash_flow_report(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    group_by: str = Query("month", regex="^(month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отчет о движении денежных средств (ОДДС)
    """
    if not start_date:
        start_date = date.today().replace(day=1)  # Первый день текущего месяца
    if not end_date:
        end_date = date.today()
    
    # Получаем все движения денег в периоде
    movements = db.query(MoneyMovement).filter(
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True
    ).order_by(MoneyMovement.date).all()
    
    # Группировка по периодам
    periods = {}
    
    for movement in movements:
        if group_by == "month":
            period_key = movement.date.strftime("%Y-%m")
            period_label = movement.date.strftime("%B %Y")
        elif group_by == "quarter":
            quarter = (movement.date.month - 1) // 3 + 1
            period_key = f"{movement.date.year}-Q{quarter}"
            period_label = f"Q{quarter} {movement.date.year}"
        else:  # year
            period_key = str(movement.date.year)
            period_label = str(movement.date.year)
        
        if period_key not in periods:
            periods[period_key] = {
                "period": period_label,
                "income": 0,
                "expense": 0,
                "net": 0
            }
        
        amount = float(movement.amount)
        if movement.movement_type == "income":
            periods[period_key]["income"] += amount
        else:
            periods[period_key]["expense"] += amount
        periods[period_key]["net"] = periods[period_key]["income"] - periods[period_key]["expense"]
    
    # Преобразуем в список и сортируем
    result = sorted([v for v in periods.values()], key=lambda x: x["period"])
    
    # Общие итоги
    total_income = sum(p["income"] for p in result)
    total_expense = sum(p["expense"] for p in result)
    total_net = total_income - total_expense
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "group_by": group_by,
        "periods": result,
        "totals": {
            "income": total_income,
            "expense": total_expense,
            "net": total_net
        }
    }

@router.get("/by-category")
def get_cash_flow_by_category(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    movement_type: str = Query(..., regex="^(income|expense)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Движение денег по категориям (статьям доходов/расходов)
    """
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
    
    from app.models.reference import IncomeItem, ExpenseItem
    
    if movement_type == "income":
        items = db.query(IncomeItem).filter(IncomeItem.is_active == True).all()
        result = []
        for item in items:
            total = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.income_item_id == item.id,
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            ).scalar() or 0
            if total > 0:
                result.append({
                    "id": item.id,
                    "name": item.name,
                    "amount": float(total)
                })
    else:
        items = db.query(ExpenseItem).filter(ExpenseItem.is_active == True).all()
        result = []
        for item in items:
            total = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.expense_item_id == item.id,
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            ).scalar() or 0
            if total > 0:
                result.append({
                    "id": item.id,
                    "name": item.name,
                    "amount": float(total)
                })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "movement_type": movement_type,
        "categories": sorted(result, key=lambda x: x["amount"], reverse=True)
    }

