from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.models.user import User
from app.models.realization import Realization, RealizationItem
from app.models.input1 import MoneyMovement
from app.models.product import Product
from app.models.shipment import Shipment
from app.models.inventory import Inventory
from app.auth.security import get_current_user
from app.auth.permissions import get_user_companies

router = APIRouter()

@router.get("/forecast/revenue")
def forecast_revenue(
    months: int = Query(3, ge=1, le=12),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Прогноз выручки на основе исторических данных"""
    # Получаем данные за последние N месяцев
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    
    query = db.query(Realization).filter(
        Realization.date >= start_date,
        Realization.date <= end_date
    )
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(Realization.company_id.in_(user_company_ids))
    
    if company_id:
        query = query.filter(Realization.company_id == company_id)
    
    realizations = query.all()
    
    # Группируем по месяцам
    monthly_data: dict = {}
    for r in realizations:
        month_key = r.date.strftime('%Y-%m')
        if month_key not in monthly_data:
            monthly_data[month_key] = []
        monthly_data[month_key].append(float(r.total_revenue))
    
    # Рассчитываем средний рост
    months_list = sorted(monthly_data.keys())
    if len(months_list) < 2:
        return {"forecast": [], "method": "insufficient_data", "message": "Недостаточно данных для прогноза"}
    
    # Простое линейное прогнозирование
    monthly_totals = [sum(monthly_data[m]) for m in months_list]
    if len(monthly_totals) < 2:
        return {"forecast": [], "method": "insufficient_data"}
    
    # Средний рост
    growth_rates = []
    for i in range(1, len(monthly_totals)):
        if monthly_totals[i-1] > 0:
            growth = (monthly_totals[i] - monthly_totals[i-1]) / monthly_totals[i-1]
            growth_rates.append(growth)
    
    avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0
    last_month_revenue = monthly_totals[-1]
    
    # Прогноз на следующие месяцы
    forecast = []
    current_date = datetime.strptime(months_list[-1], '%Y-%m').date()
    for i in range(1, months + 1):
        forecast_month = current_date + timedelta(days=30 * i)
        forecast_revenue = last_month_revenue * (1 + avg_growth) ** i
        forecast.append({
            "month": forecast_month.strftime('%Y-%m'),
            "forecasted_revenue": round(forecast_revenue, 2),
            "growth_rate": round(avg_growth * 100, 2)
        })
    
    return {
        "forecast": forecast,
        "method": "linear",
        "average_growth": round(avg_growth * 100, 2),
        "last_month_revenue": last_month_revenue
    }

@router.get("/forecast/inventory")
def forecast_inventory(
    product_id: Optional[int] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Прогноз остатков товаров на основе оборачиваемости"""
    # Получаем текущие остатки
    query = db.query(Inventory)
    
    if product_id:
        query = query.filter(Inventory.product_id == product_id)
    if warehouse_id:
        query = query.filter(Inventory.warehouse_id == warehouse_id)
    
    inventories = query.all()
    
    forecasts = []
    for inv in inventories:
        # Получаем историю продаж за последние 30 дней
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        # Подсчитываем средний расход в день
        # Упрощенный расчет - можно улучшить
        avg_daily_consumption = float(inv.quantity) / 30 if inv.quantity > 0 else 0
        
        forecasted_quantity = max(0, float(inv.quantity) - (avg_daily_consumption * days))
        days_until_zero = float(inv.quantity) / avg_daily_consumption if avg_daily_consumption > 0 else 999
        
        forecasts.append({
            "product_id": inv.product_id,
            "warehouse_id": inv.warehouse_id,
            "current_quantity": float(inv.quantity),
            "forecasted_quantity": round(forecasted_quantity, 2),
            "days_until_zero": round(days_until_zero, 0),
            "avg_daily_consumption": round(avg_daily_consumption, 2)
        })
    
    return {"forecasts": forecasts}

@router.get("/comparison/periods")
def compare_periods(
    period1_start: date = Query(...),
    period1_end: date = Query(...),
    period2_start: date = Query(...),
    period2_end: date = Query(...),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Сравнение двух периодов"""
    def get_period_data(start: date, end: date):
        # Выручка
        revenue_query = db.query(func.sum(Realization.total_revenue)).filter(
            Realization.date >= start,
            Realization.date <= end
        )
        
        # Расходы
        expense_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.date >= start,
            MoneyMovement.date <= end,
            MoneyMovement.movement_type == 'expense',
            MoneyMovement.is_business == True
        )
        
        if current_user.role.value != "ADMIN":
            user_company_ids = get_user_companies(current_user.id, db)
            revenue_query = revenue_query.filter(Realization.company_id.in_(user_company_ids))
            expense_query = expense_query.filter(MoneyMovement.company_id.in_(user_company_ids))
        
        if company_id:
            revenue_query = revenue_query.filter(Realization.company_id == company_id)
            expense_query = expense_query.filter(MoneyMovement.company_id == company_id)
        
        revenue = revenue_query.scalar() or 0
        expenses = expense_query.scalar() or 0
        profit = float(revenue) - float(expenses)
        
        return {
            "revenue": float(revenue),
            "expenses": float(expenses),
            "profit": profit,
            "margin": (profit / float(revenue) * 100) if revenue > 0 else 0
        }
    
    period1 = get_period_data(period1_start, period1_end)
    period2 = get_period_data(period2_start, period2_end)
    
    # Рассчитываем изменения
    def calc_change(old_val: float, new_val: float):
        if old_val == 0:
            return 100 if new_val > 0 else 0
        return ((new_val - old_val) / old_val) * 100
    
    return {
        "period1": {
            **period1,
            "start": period1_start.isoformat(),
            "end": period1_end.isoformat()
        },
        "period2": {
            **period2,
            "start": period2_start.isoformat(),
            "end": period2_end.isoformat()
        },
        "changes": {
            "revenue": round(calc_change(period1["revenue"], period2["revenue"]), 2),
            "expenses": round(calc_change(period1["expenses"], period2["expenses"]), 2),
            "profit": round(calc_change(period1["profit"], period2["profit"]), 2),
            "margin": round(period2["margin"] - period1["margin"], 2)
        }
    }

@router.get("/abc-xyz-analysis")
def abc_xyz_analysis(
    company_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ABC/XYZ анализ товаров"""
    if not start_date:
        start_date = date.today() - timedelta(days=90)
    if not end_date:
        end_date = date.today()
    
    # Получаем данные о продажах товаров
    query = db.query(
        Product.id,
        Product.name,
        Product.sku,
        func.sum(RealizationItem.quantity).label('total_quantity'),
        func.sum(RealizationItem.price * RealizationItem.quantity).label('total_revenue')
    ).join(
        RealizationItem, Product.id == RealizationItem.product_id
    ).join(
        Realization, RealizationItem.realization_id == Realization.id
    ).filter(
        Realization.date >= start_date,
        Realization.date <= end_date
    ).group_by(Product.id, Product.name, Product.sku)
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(Realization.company_id.in_(user_company_ids))
    
    if company_id:
        query = query.filter(Realization.company_id == company_id)
    
    products_data = query.all()
    
    if not products_data:
        return {"analysis": [], "message": "Нет данных для анализа"}
    
    # Рассчитываем общую выручку
    total_revenue = sum(float(p.total_revenue) for p in products_data)
    
    # ABC анализ (по выручке)
    products_with_abc = []
    cumulative_percent = 0
    
    sorted_by_revenue = sorted(products_data, key=lambda x: float(x.total_revenue), reverse=True)
    
    for i, product in enumerate(sorted_by_revenue):
        revenue = float(product.total_revenue)
        percent = (revenue / total_revenue * 100) if total_revenue > 0 else 0
        cumulative_percent += percent
        
        # Классификация ABC
        if cumulative_percent <= 80:
            abc_class = 'A'
        elif cumulative_percent <= 95:
            abc_class = 'B'
        else:
            abc_class = 'C'
        
        products_with_abc.append({
            "product_id": product.id,
            "name": product.name,
            "sku": product.sku,
            "revenue": revenue,
            "quantity": float(product.total_quantity),
            "revenue_percent": round(percent, 2),
            "cumulative_percent": round(cumulative_percent, 2),
            "abc_class": abc_class
        })
    
    # XYZ анализ (по стабильности спроса) - упрощенный
    # В реальности нужен расчет коэффициента вариации
    for product in products_with_abc:
        # Упрощенная классификация XYZ
        if product["revenue_percent"] > 5:
            xyz_class = 'X'  # Стабильный спрос
        elif product["revenue_percent"] > 1:
            xyz_class = 'Y'  # Нестабильный спрос
        else:
            xyz_class = 'Z'  # Нерегулярный спрос
        
        product["xyz_class"] = xyz_class
        product["abc_xyz"] = f"{product['abc_class']}{xyz_class}"
    
    return {
        "analysis": products_with_abc,
        "total_products": len(products_with_abc),
        "total_revenue": total_revenue,
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        }
    }

