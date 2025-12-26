from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, or_
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.models.reference import Marketplace, SalesChannel
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_cash_flow_analysis(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Детальный анализ движения денежных средств (Анализ ДДС)
    Разбивка по каналам продаж, маржинальный доход, производственные расходы
    """
    try:
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()
        
        # Получаем каналы продаж из справочника
        sales_channels = db.query(SalesChannel).filter(SalesChannel.is_active == True).all()
        channels = [channel.name for channel in sales_channels]
        
        # Если справочник пуст, используем дефолтные каналы
        if not channels:
            channels = ['WB', 'Ozon', 'WB Gold', 'Яндекс', 'Частные заказы', 'Аренда']
        
        # Выручка по каналам из реализации (используем marketplace_id через join)
        revenue_by_channel = {}
        
        # Сначала получаем все маркетплейсы для отладки
        all_marketplaces = db.query(Marketplace).filter(Marketplace.is_active == True).all()
        print(f"[DEBUG] Всего активных маркетплейсов: {len(all_marketplaces)}")
        for mp in all_marketplaces:
            print(f"  - {mp.name} (ID: {mp.id})")
        
        # Проверяем, есть ли данные в реализации
        total_realizations = db.query(func.count(Realization.id)).filter(
            Realization.date >= start_date,
            Realization.date <= end_date
        ).scalar() or 0
        print(f"[DEBUG] Всего записей реализации за период: {total_realizations}")
        
        for channel in channels:
            # Определяем фильтр по названию маркетплейса через join
            # Используем более гибкие фильтры
            marketplace_filters = []
            
            if channel == 'WB' or channel == 'Wildberries':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%wildberries%'),
                    func.lower(Marketplace.name).like('%wb%'),
                    func.lower(Marketplace.name) == 'wb',
                    func.lower(Marketplace.name) == 'wildberries',
                ]
            elif channel == 'WB Gold':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%gold%'),
                    func.lower(Marketplace.name).like('%wb gold%'),
                ]
            elif channel == 'Ozon' or channel == 'OZON':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%ozon%'),
                    func.lower(Marketplace.name) == 'ozon',
                    func.lower(Marketplace.name) == 'ozon.ru',
                ]
            elif channel == 'Яндекс':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%яндекс%'),
                    func.lower(Marketplace.name).like('%yandex%'),
                ]
            elif channel == 'Частные заказы':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%частн%'),
                    func.lower(Marketplace.name).like('%private%'),
                ]
            elif channel == 'Аренда':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%аренд%'),
                    func.lower(Marketplace.name).like('%rent%'),
                ]
            else:
                # Точное совпадение или LIKE
                marketplace_filters = [
                    func.lower(Marketplace.name) == channel.lower(),
                    func.lower(Marketplace.name).like(f'%{channel.lower()}%'),
                ]
            
            # Используем OR для всех фильтров
            marketplace_name_filter = or_(*marketplace_filters)
            
            try:
                revenue_query = db.query(func.sum(Realization.revenue)).join(
                    Marketplace, Realization.marketplace_id == Marketplace.id
                ).filter(
                    Realization.date >= start_date,
                    Realization.date <= end_date,
                    marketplace_name_filter
                )
                if company_id:
                    revenue_query = revenue_query.filter(Realization.company_id == company_id)
                revenue = revenue_query.scalar() or 0
                
                # Отладка
                if revenue > 0:
                    print(f"[DEBUG] Канал '{channel}': найдена выручка {revenue}")
            except Exception as e:
                print(f"[ERROR] Ошибка запроса выручки для канала {channel}: {e}")
                import traceback
                traceback.print_exc()
                revenue = 0
            
            revenue_by_channel[channel] = float(revenue)
        
        # Затраты на маркетплейсах по каналам (из отгрузок)
        marketplace_costs_by_channel = {}
        for channel in channels:
            # Используем ту же логику фильтрации, что и для выручки
            marketplace_filters = []
            
            if channel == 'WB' or channel == 'Wildberries':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%wildberries%'),
                    func.lower(Marketplace.name).like('%wb%'),
                    func.lower(Marketplace.name) == 'wb',
                    func.lower(Marketplace.name) == 'wildberries',
                ]
            elif channel == 'WB Gold':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%gold%'),
                    func.lower(Marketplace.name).like('%wb gold%'),
                ]
            elif channel == 'Ozon' or channel == 'OZON':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%ozon%'),
                    func.lower(Marketplace.name) == 'ozon',
                    func.lower(Marketplace.name) == 'ozon.ru',
                ]
            elif channel == 'Яндекс':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%яндекс%'),
                    func.lower(Marketplace.name).like('%yandex%'),
                ]
            elif channel == 'Частные заказы':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%частн%'),
                    func.lower(Marketplace.name).like('%private%'),
                ]
            elif channel == 'Аренда':
                marketplace_filters = [
                    func.lower(Marketplace.name).like('%аренд%'),
                    func.lower(Marketplace.name).like('%rent%'),
                ]
            else:
                marketplace_filters = [
                    func.lower(Marketplace.name) == channel.lower(),
                    func.lower(Marketplace.name).like(f'%{channel.lower()}%'),
                ]
            
            marketplace_name_filter = or_(*marketplace_filters)
            
            try:
                # Затраты на маркетплейсах = сумма (cost_price * quantity) для отгрузок
                cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).join(
                    Marketplace, Shipment.marketplace_id == Marketplace.id
                ).filter(
                    Shipment.date >= start_date,
                    Shipment.date <= end_date,
                    marketplace_name_filter
                )
                if company_id:
                    cost_query = cost_query.filter(Shipment.company_id == company_id)
                cost = cost_query.scalar() or 0
            except Exception as e:
                print(f"[ERROR] Ошибка запроса затрат для канала {channel}: {e}")
                cost = 0
            
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
        
        direct_production_costs_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True,
            MoneyMovement.expense_item_id.in_(production_expense_ids) if production_expense_ids else True
        )
        if company_id:
            direct_production_costs_query = direct_production_costs_query.filter(MoneyMovement.company_id == company_id)
        direct_production_costs = direct_production_costs_query.scalar() or 0
        
        # Если нет специальных статей, берем все расходы как производственные
        if direct_production_costs == 0:
            all_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            )
            if company_id:
                all_expenses_query = all_expenses_query.filter(MoneyMovement.company_id == company_id)
            direct_production_costs = all_expenses_query.scalar() or 0
        
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
        
        administrative_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True,
            MoneyMovement.expense_item_id.in_(admin_expense_ids) if admin_expense_ids else True
        )
        if company_id:
            administrative_expenses_query = administrative_expenses_query.filter(MoneyMovement.company_id == company_id)
        administrative_expenses = administrative_expenses_query.scalar() or 0
        
        # Коммерческие расходы
        commercial_expense_items = db.query(ExpenseItem).filter(
            ExpenseItem.is_active == True,
            func.lower(ExpenseItem.name).in_([
                'маркетинг', 'реклама', 'доставка', 'продажи', 'коммерческие'
            ])
        ).all()
        
        commercial_expense_ids = [item.id for item in commercial_expense_items]
        
        commercial_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True,
            MoneyMovement.expense_item_id.in_(commercial_expense_ids) if commercial_expense_ids else True
        )
        if company_id:
            commercial_expenses_query = commercial_expenses_query.filter(MoneyMovement.company_id == company_id)
        commercial_expenses = commercial_expenses_query.scalar() or 0
        
        # Если нет специальных статей, делим расходы пополам
        if administrative_expenses == 0 and commercial_expenses == 0:
            all_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            )
            if company_id:
                all_expenses_query = all_expenses_query.filter(MoneyMovement.company_id == company_id)
            all_expenses = all_expenses_query.scalar() or 0
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
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in cash_flow_analysis: {str(e)}")
        print(error_detail)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Ошибка при расчете анализа ДДС: {str(e)}")
