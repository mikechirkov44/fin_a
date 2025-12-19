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
def get_profit_loss_analysis(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Детальный анализ прибылей и убытков (Анализ ОПУ)
    Разбивка по каналам, валовая прибыль по направлениям, производственные расходы
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
            marketplace_filter = func.lower(Realization.marketplace) == channel.lower()
        
        revenue = db.query(func.sum(Realization.revenue)).filter(
            Realization.date >= start_date,
            Realization.date <= end_date,
            marketplace_filter
        ).scalar() or 0
        
        revenue_by_channel[channel] = float(revenue)
    
    # Производственные расходы по каналам
    # Затраты на маркетплейсах
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
        
        cost = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.date >= start_date,
            Shipment.date <= end_date,
            marketplace_filter
        ).scalar() or 0
        
        marketplace_costs_by_channel[channel] = float(cost)
    
    # Прямые производственные расходы по каналам
    # ЗП производство, ЗП аутсорс, Сырьевые затраты
    from app.models.reference import ExpenseItem
    
    # Получаем статьи расходов для производства
    production_items = db.query(ExpenseItem).filter(
        ExpenseItem.is_active == True
    ).all()
    
    # Для упрощения считаем все расходы как производственные
    # В реальности нужно будет добавить категории или теги к статьям расходов
    direct_production_costs_total = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True
    ).scalar() or 0
    
    # Распределяем производственные расходы пропорционально выручке
    total_revenue = sum(revenue_by_channel.values())
    direct_production_by_channel = {}
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        if total_revenue > 0:
            direct_production_by_channel[channel] = float(direct_production_costs_total) * (revenue / total_revenue)
        else:
            direct_production_by_channel[channel] = 0
    
    # Валовая прибыль по направлениям (ВП1) = Выручка - Затраты на MP - Прямые производственные
    gross_profit_by_channel = {}
    gross_margin_by_channel = {}
    
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        marketplace_cost = marketplace_costs_by_channel.get(channel, 0)
        direct_production = direct_production_by_channel.get(channel, 0)
        
        gross_profit = revenue - marketplace_cost - direct_production
        gross_profit_by_channel[channel] = gross_profit
        
        margin = (gross_profit / revenue * 100) if revenue > 0 else 0
        gross_margin_by_channel[channel] = round(margin, 2)
    
    # Общая валовая прибыль
    total_gross_profit = sum(gross_profit_by_channel.values())
    
    # Косвенные расходы
    # Административные расходы
    admin_expense_items = db.query(ExpenseItem).filter(
        ExpenseItem.is_active == True,
        func.lower(ExpenseItem.name).in_([
            'аренда', 'зарплата управляющий', 'бухгалтер', 'офис', 'коммунальные',
            'административные', 'управленческие', 'бонусы'
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
            'маркетинг', 'реклама', 'доставка', 'продажи', 'коммерческие', 'упаковка'
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
        # Вычитаем уже учтенные производственные расходы
        remaining = float(all_expenses) - float(direct_production_costs_total)
        if remaining > 0:
            administrative_expenses = remaining * 0.5
            commercial_expenses = remaining * 0.5
    
    total_indirect_expenses = float(administrative_expenses) + float(commercial_expenses)
    
    # Операционная прибыль (EBITDA)
    operating_profit = total_gross_profit - total_indirect_expenses
    
    # Налоги и прочие расходы ниже EBITDA
    taxes = 0  # Можно добавить позже
    other_expenses_below_ebitda = 0  # Амортизация и т.д.
    
    # Чистая прибыль
    net_profit = operating_profit - float(taxes) - float(other_expenses_below_ebitda)
    
    # Рентабельность
    total_revenue_sum = sum(revenue_by_channel.values())
    total_gross_margin = (total_gross_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
    operating_margin = (operating_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
    net_margin = (net_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
    
    # Формируем результат по каналам
    channels_data = []
    for channel in channels:
        revenue = revenue_by_channel.get(channel, 0)
        marketplace_cost = marketplace_costs_by_channel.get(channel, 0)
        direct_production = direct_production_by_channel.get(channel, 0)
        gross_profit = gross_profit_by_channel.get(channel, 0)
        gross_margin = gross_margin_by_channel.get(channel, 0)
        
        channels_data.append({
            "channel": channel,
            "revenue": revenue,
            "marketplace_costs": marketplace_cost,
            "direct_production_costs": direct_production,
            "gross_profit": gross_profit,
            "gross_margin": gross_margin
        })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total_revenue_sum,
        "total_marketplace_costs": sum(marketplace_costs_by_channel.values()),
        "total_direct_production_costs": float(direct_production_costs_total),
        "total_gross_profit": total_gross_profit,
        "gross_margin": round(total_gross_margin, 2),
        "administrative_expenses": float(administrative_expenses),
        "commercial_expenses": float(commercial_expenses),
        "total_indirect_expenses": total_indirect_expenses,
        "operating_profit": operating_profit,
        "operating_margin": round(operating_margin, 2),
        "taxes": float(taxes),
        "other_expenses_below_ebitda": float(other_expenses_below_ebitda),
        "net_profit": net_profit,
        "net_margin": round(net_margin, 2),
        "channels": channels_data
    }
