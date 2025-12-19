from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_cash_flow_analysis(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Детальный анализ движения денежных средств (Анализ ДДС)
    Разбивка по каналам продаж, маржинальный доход, производственные расходы
    """
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
    
    # Определяем каналы продаж
    channels = ['WB', 'Ozon', 'WB Gold', 'Яндекс', 'Частные заказы', 'Аренда']
    
    # Выручка по каналам из реализации
    revenue_by_channel = {}
    for channel in channels:
        # Нормализуем название канала для поиска в БД
        channel_lower = channel.lower().replace(' ', '')
        if channel == 'WB':
            marketplace_filter = case(
                (func.lower(Realization.marketplace).like('%wb%'), True),
                (func.lower(Realization.marketplace).like('%wildberries%'), True),
                else_=False
            )
        elif channel == 'WB Gold':
            marketplace_filter = func.lower(Realization.marketplace).like('%gold%')
        elif channel == 'Ozon':
            marketplace_filter = func.lower(Realization.marketplace).like('%ozon%')
        elif channel == 'Яндекс':
            marketplace_filter = func.lower(Realization.marketplace).like('%яндекс%')
        elif channel == 'Частные заказы':
            marketplace_filter = func.lower(Realization.marketplace).like('%частн%')
        elif channel == 'Аренда':
            marketplace_filter = func.lower(Realization.marketplace).like('%аренд%')
        else:
            marketplace_filter = func.lower(Realization.marketplace) == channel_lower
        
        revenue = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= start_date,
            Realization.date <= end_date,
            marketplace_filter
        ).scalar() or 0
        
        revenue_by_channel[channel] = float(revenue)
    
    # Затраты на маркетплейсах по каналам (из отгрузок)
    marketplace_costs_by_channel = {}
    for channel in channels:
        if channel == 'WB':
            marketplace_filter = case(
                (func.lower(Shipment.marketplace).like('%wb%'), True),
                (func.lower(Shipment.marketplace).like('%wildberries%'), True),
                else_=False
            )
        elif channel == 'WB Gold':
            marketplace_filter = func.lower(Shipment.marketplace).like('%gold%')
        elif channel == 'Ozon':
            marketplace_filter = func.lower(Shipment.marketplace).like('%ozon%')
        elif channel == 'Яндекс':
            marketplace_filter = func.lower(Shipment.marketplace).like('%яндекс%')
        elif channel == 'Частные заказы':
            marketplace_filter = func.lower(Shipment.marketplace).like('%частн%')
        elif channel == 'Аренда':
            marketplace_filter = func.lower(Shipment.marketplace).like('%аренд%')
        else:
            marketplace_filter = func.lower(Shipment.marketplace) == channel.lower()
        
        # Затраты на маркетплейсах = сумма (cost_price * quantity) для отгрузок
        cost = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= start_date,
            Shipment.date <= end_date,
            marketplace_filter
        ).scalar() or 0
        
        marketplace_costs_by_channel[channel] = float(cost)
    
    # Маржинальный доход по каналам (выручка - затраты на маркетплейсах)
    marginal_income_by_channel = {}
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        marketplace_cost = marketplace_costs_by_channel.get(channel, 0)
        marginal_income_by_channel[channel] = revenue - marketplace_cost
    
    # Рентабельность по маржинальному доходу
    marginal_margin_by_channel = {}
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        marginal = marginal_income_by_channel.get(channel, 0)
        margin = (marginal / revenue * 100) if revenue > 0 else 0
        marginal_margin_by_channel[channel] = round(margin, 2)
    
    # Прямые производственные расходы (из ВВОД 1, статьи расходов связанные с производством)
    # Для упрощения берем все расходы, связанные с производством
    from app.models.reference import ExpenseItem
    
    production_expense_items = db.query(ExpenseItem).filter(
        ExpenseItem.is_active == True,
        func.lower(ExpenseItem.name).in_([
            'сырье', 'материалы', 'зарплата швеи', 'зарплата производство',
            'аутсорс', 'производство', 'швеи', 'мастера'
        ])
    ).all()
    
    production_expense_ids = [item.id for item in production_expense_items]
    
    direct_production_costs = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True,
        MoneyMovement.expense_item_id.in_(production_expense_ids) if production_expense_ids else True
    ).scalar() or 0
    
    # Если нет специальных статей, берем все расходы как производственные
    if direct_production_costs == 0:
        direct_production_costs = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True
        ).scalar() or 0
    
    # Валовая прибыль (маржинальный доход - прямые производственные расходы)
    total_marginal_income = sum(marginal_income_by_channel.values())
    gross_profit = total_marginal_income - float(direct_production_costs)
    
    # Косвенные расходы (административные + коммерческие)
    # Административные расходы
    admin_expense_items = db.query(ExpenseItem).filter(
        ExpenseItem.is_active == True,
        func.lower(ExpenseItem.name).in_([
            'аренда', 'зарплата управляющий', 'бухгалтер', 'офис', 'коммунальные',
            'административные', 'управленческие'
        ])
    ).all()
    
    admin_expense_ids = [item.id for item in admin_expense_items]
    
    administrative_expenses = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True,
        MoneyMovement.expense_item_id.in_(admin_expense_ids) if admin_expense_ids else True
    ).scalar() or 0
    
    # Коммерческие расходы
    commercial_expense_items = db.query(ExpenseItem).filter(
        ExpenseItem.is_active == True,
        func.lower(ExpenseItem.name).in_([
            'маркетинг', 'реклама', 'доставка', 'продажи', 'коммерческие'
        ])
    ).all()
    
    commercial_expense_ids = [item.id for item in commercial_expense_items]
    
    commercial_expenses = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True,
        MoneyMovement.expense_item_id.in_(commercial_expense_ids) if commercial_expense_ids else True
    ).scalar() or 0
    
    # Если нет специальных статей, делим расходы пополам
    if administrative_expenses == 0 and commercial_expenses == 0:
        all_expenses = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True
        ).scalar() or 0
        administrative_expenses = float(all_expenses) * 0.5
        commercial_expenses = float(all_expenses) * 0.5
    
    total_indirect_expenses = float(administrative_expenses) + float(commercial_expenses)
    
    # Операционная прибыль (EBITDA)
    operating_profit = gross_profit - total_indirect_expenses
    
    # Общая выручка
    total_revenue = sum(revenue_by_channel.values())
    
    # Общие затраты на маркетплейсах
    total_marketplace_costs = sum(marketplace_costs_by_channel.values())
    
    # Формируем результат по каналам
    channels_data = []
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        marketplace_cost = marketplace_costs_by_channel.get(channel, 0)
        marginal = marginal_income_by_channel.get(channel, 0)
        margin = marginal_margin_by_channel.get(channel, 0)
        
        channels_data.append({
            "channel": channel,
            "revenue": revenue,
            "marketplace_costs": marketplace_cost,
            "marginal_income": marginal,
            "marginal_margin": margin
        })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total_revenue,
        "total_marketplace_costs": total_marketplace_costs,
        "total_marginal_income": total_marginal_income,
        "direct_production_costs": float(direct_production_costs),
        "gross_profit": gross_profit,
        "administrative_expenses": float(administrative_expenses),
        "commercial_expenses": float(commercial_expenses),
        "total_indirect_expenses": total_indirect_expenses,
        "operating_profit": operating_profit,
        "channels": channels_data
    }
