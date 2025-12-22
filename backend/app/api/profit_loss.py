from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_profit_loss_report(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Отчет о прибылях и убытках (ОПУ)
    """
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
    
    # Выручка из реализации
    revenue_query = db.query(func.sum(Realization.revenue)).filter(
        Realization.date >= start_date,
        Realization.date <= end_date
    )
    if company_id:
        revenue_query = revenue_query.filter(Realization.company_id == company_id)
    revenue = revenue_query.scalar() or 0
    
    # Сырьевая себестоимость из отгрузок
    cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
        Shipment.date >= start_date,
        Shipment.date <= end_date
    )
    if company_id:
        cost_query = cost_query.filter(Shipment.company_id == company_id)
    cost_of_goods_sold = cost_query.scalar() or 0
    
    # Валовая прибыль
    gross_profit = float(revenue) - float(cost_of_goods_sold)
    
    # Коммерческие расходы (из ВВОД 1, тип expense, категория коммерческие)
    # Для упрощения считаем все расходы как коммерческие/управленческие
    expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True
    )
    if company_id:
        expenses_query = expenses_query.filter(MoneyMovement.company_id == company_id)
    commercial_expenses = expenses_query.scalar() or 0
    
    # Управленческие расходы (можно добавить отдельную категорию позже)
    administrative_expenses = 0  # Пока не реализовано
    
    # Операционная прибыль
    operating_profit = gross_profit - float(commercial_expenses) - float(administrative_expenses)
    
    # Прочие доходы и расходы
    other_income = 0  # Можно добавить позже
    other_expenses = 0  # Можно добавить позже
    
    # Прибыль до налогообложения
    profit_before_tax = operating_profit + float(other_income) - float(other_expenses)
    
    # Налоги (можно добавить позже)
    taxes = 0
    
    # Чистая прибыль
    net_profit = profit_before_tax - float(taxes)
    
    # Рентабельность
    gross_margin = (gross_profit / float(revenue) * 100) if revenue > 0 else 0
    net_margin = (net_profit / float(revenue) * 100) if revenue > 0 else 0
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "revenue": float(revenue),
        "cost_of_goods_sold": float(cost_of_goods_sold),
        "gross_profit": gross_profit,
        "gross_margin": round(gross_margin, 2),
        "commercial_expenses": float(commercial_expenses),
        "administrative_expenses": float(administrative_expenses),
        "operating_profit": operating_profit,
        "other_income": float(other_income),
        "other_expenses": float(other_expenses),
        "profit_before_tax": profit_before_tax,
        "taxes": float(taxes),
        "net_profit": net_profit,
        "net_margin": round(net_margin, 2)
    }

