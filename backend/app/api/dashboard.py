from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_dashboard(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Панель приборов с основными показателями и графиками
    """
    if not start_date:
        start_date = date.today() - timedelta(days=90)  # Последние 3 месяца
    if not end_date:
        end_date = date.today()
    
    # Динамика остатков на счетах (по месяцам)
    cash_balance_by_month = []
    current_date = start_date.replace(day=1)
    while current_date <= end_date:
        month_end = (current_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        if month_end > end_date:
            month_end = end_date
        
        income = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "income",
            MoneyMovement.is_business == True,
            MoneyMovement.date <= month_end
        ).scalar() or 0
        
        expense = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.is_business == True,
            MoneyMovement.date <= month_end
        ).scalar() or 0
        
        cash_balance_by_month.append({
            "period": current_date.strftime("%Y-%m"),
            "label": current_date.strftime("%B %Y"),
            "balance": float(income) - float(expense)
        })
        
        # Следующий месяц
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    # Динамика чистой прибыли
    net_profit_by_month = []
    current_date = start_date.replace(day=1)
    while current_date <= end_date:
        month_start = current_date
        month_end = (current_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        if month_end > end_date:
            month_end = end_date
        
        revenue = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= month_start,
            Realization.date <= month_end
        ).scalar() or 0
        
        cost_of_goods = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= month_start,
            Shipment.date <= month_end
        ).scalar() or 0
        
        expenses = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.is_business == True,
            MoneyMovement.date >= month_start,
            MoneyMovement.date <= month_end
        ).scalar() or 0
        
        net_profit = float(revenue) - float(cost_of_goods) - float(expenses)
        net_margin = (net_profit / float(revenue) * 100) if revenue > 0 else 0
        
        net_profit_by_month.append({
            "period": current_date.strftime("%Y-%m"),
            "label": current_date.strftime("%B %Y"),
            "net_profit": net_profit,
            "net_margin": round(net_margin, 2)
        })
        
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    # Динамика валовой прибыли и рентабельности
    gross_profit_by_month = []
    current_date = start_date.replace(day=1)
    while current_date <= end_date:
        month_start = current_date
        month_end = (current_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        if month_end > end_date:
            month_end = end_date
        
        revenue = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= month_start,
            Realization.date <= month_end
        ).scalar() or 0
        
        cost_of_goods = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= month_start,
            Shipment.date <= month_end
        ).scalar() or 0
        
        gross_profit = float(revenue) - float(cost_of_goods)
        gross_margin = (gross_profit / float(revenue) * 100) if revenue > 0 else 0
        
        gross_profit_by_month.append({
            "period": current_date.strftime("%Y-%m"),
            "label": current_date.strftime("%B %Y"),
            "gross_profit": gross_profit,
            "gross_margin": round(gross_margin, 2)
        })
        
        if current_date.month == 12:
            current_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            current_date = current_date.replace(month=current_date.month + 1)
    
    # Текущие показатели
    total_revenue = db.query(func.sum(Realization.revenue)).filter(
        Realization.date >= start_date,
        Realization.date <= end_date
    ).scalar() or 0
    
    total_cost = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
        Shipment.date >= start_date,
        Shipment.date <= end_date
    ).scalar() or 0
    
    total_expenses = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.is_business == True,
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date
    ).scalar() or 0
    
    current_gross_profit = float(total_revenue) - float(total_cost)
    current_net_profit = current_gross_profit - float(total_expenses)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "cash_balance_dynamics": cash_balance_by_month,
        "net_profit_dynamics": net_profit_by_month,
        "gross_profit_dynamics": gross_profit_by_month,
        "current_indicators": {
            "revenue": float(total_revenue),
            "cost_of_goods": float(total_cost),
            "expenses": float(total_expenses),
            "gross_profit": current_gross_profit,
            "gross_margin": round((current_gross_profit / float(total_revenue) * 100) if total_revenue > 0 else 0, 2),
            "net_profit": current_net_profit,
            "net_margin": round((current_net_profit / float(total_revenue) * 100) if total_revenue > 0 else 0, 2)
        }
    }

