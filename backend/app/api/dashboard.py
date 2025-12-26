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
from app.auth.permissions import get_user_companies
from app.services.inventory_service import get_low_stock_alerts

router = APIRouter()

@router.get("/")
def get_dashboard(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    company_id: int | None = Query(None),
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
        
        income_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "income",
            MoneyMovement.is_business == True,
            MoneyMovement.date <= month_end
        )
        if company_id:
            income_query = income_query.filter(MoneyMovement.company_id == company_id)
        income = income_query.scalar() or 0
        
        expense_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.is_business == True,
            MoneyMovement.date <= month_end
        )
        if company_id:
            expense_query = expense_query.filter(MoneyMovement.company_id == company_id)
        expense = expense_query.scalar() or 0
        
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
        
        revenue_query = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= month_start,
            Realization.date <= month_end
        )
        if company_id:
            revenue_query = revenue_query.filter(Realization.company_id == company_id)
        revenue = revenue_query.scalar() or 0
        
        cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= month_start,
            Shipment.date <= month_end
        )
        if company_id:
            cost_query = cost_query.filter(Shipment.company_id == company_id)
        cost_of_goods = cost_query.scalar() or 0
        
        expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.is_business == True,
            MoneyMovement.date >= month_start,
            MoneyMovement.date <= month_end
        )
        if company_id:
            expenses_query = expenses_query.filter(MoneyMovement.company_id == company_id)
        expenses = expenses_query.scalar() or 0
        
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
        
        revenue_query = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= month_start,
            Realization.date <= month_end
        )
        if company_id:
            revenue_query = revenue_query.filter(Realization.company_id == company_id)
        revenue = revenue_query.scalar() or 0
        
        cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= month_start,
            Shipment.date <= month_end
        )
        if company_id:
            cost_query = cost_query.filter(Shipment.company_id == company_id)
        cost_of_goods = cost_query.scalar() or 0
        
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
    total_revenue_query = db.query(func.sum(Realization.revenue)).filter(
        Realization.date >= start_date,
        Realization.date <= end_date
    )
    if company_id:
        total_revenue_query = total_revenue_query.filter(Realization.company_id == company_id)
    total_revenue = total_revenue_query.scalar() or 0
    
    total_cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
        Shipment.date >= start_date,
        Shipment.date <= end_date
    )
    if company_id:
        total_cost_query = total_cost_query.filter(Shipment.company_id == company_id)
    total_cost = total_cost_query.scalar() or 0
    
    total_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.is_business == True,
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date
    )
    if company_id:
        total_expenses_query = total_expenses_query.filter(MoneyMovement.company_id == company_id)
    total_expenses = total_expenses_query.scalar() or 0
    
    current_gross_profit = float(total_revenue) - float(total_cost)
    current_net_profit = current_gross_profit - float(total_expenses)
    
    # Получаем рекомендации (алерты на низкие остатки)
    recommendations = []
    if company_id:
        alerts = get_low_stock_alerts(company_id, db)
        for alert in alerts:
            recommendations.append({
                "type": "low_stock",
                "title": f"Низкий остаток: {alert['product_name']}",
                "message": f"Товар '{alert['product_name']}' на складе '{alert['warehouse_name']}' имеет остаток {alert['current_quantity']}, что ниже минимального уровня {alert['min_stock_level']}. Необходимо пополнить на {alert['deficit']} единиц.",
                "product_id": alert['product_id'],
                "warehouse_id": alert['warehouse_id'],
                "priority": "high"
            })
    else:
        # Получаем алерты для всех доступных организаций
        user_companies = get_user_companies(current_user.id, db)
        for comp_id in user_companies:
            alerts = get_low_stock_alerts(comp_id, db)
            for alert in alerts:
                recommendations.append({
                    "type": "low_stock",
                    "title": f"Низкий остаток: {alert['product_name']}",
                    "message": f"Товар '{alert['product_name']}' на складе '{alert['warehouse_name']}' имеет остаток {alert['current_quantity']}, что ниже минимального уровня {alert['min_stock_level']}. Необходимо пополнить на {alert['deficit']} единиц.",
                    "product_id": alert['product_id'],
                    "warehouse_id": alert['warehouse_id'],
                    "priority": "high"
                })
    
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
        },
        "recommendations": recommendations
    }

