"""
Сервис для создания автоматических уведомлений
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from datetime import datetime

def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_table: str | None = None,
    related_id: int | None = None
):
    """Создать уведомление"""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_table=related_table,
        related_id=related_id
    )
    db.add(notification)
    db.commit()
    return notification

def _get_period_dates(period_type, period_value):
    """Получить начальную и конечную даты периода"""
    from datetime import date, timedelta
    
    if period_type.value == "month":
        # period_value = "2024-01"
        year, month = map(int, period_value.split("-"))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        end_date = end_date - timedelta(days=1)
    elif period_type.value == "quarter":
        # period_value = "2024-Q1"
        year, quarter = period_value.split("-Q")
        year = int(year)
        quarter = int(quarter)
        start_month = (quarter - 1) * 3 + 1
        end_month = quarter * 3
        start_date = date(year, start_month, 1)
        if end_month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, end_month + 1, 1)
        end_date = end_date - timedelta(days=1)
    else:  # YEAR
        # period_value = "2024"
        year = int(period_value)
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    
    return start_date, end_date

def check_budget_deviations(db: Session):
    """Проверить отклонения от бюджета и создать уведомления"""
    from app.models.budget import Budget, BudgetPeriod, BudgetType
    from app.models.input1 import MoneyMovement
    from sqlalchemy import func as sql_func, and_
    
    # Получаем все активные бюджеты
    budgets = db.query(Budget).all()
    
    notifications_created = []
    
    for budget in budgets:
        start_date, end_date = _get_period_dates(budget.period_type, budget.period_value)
        
        # Проверяем, не истек ли период
        if datetime.now().date() < end_date:
            continue  # Период еще не закончился
        
        # Получаем фактические данные
        actual_query = db.query(sql_func.coalesce(sql_func.sum(MoneyMovement.amount), 0))
        
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
        else:
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
        
        actual_amount = float(actual_query.scalar() or 0)
        planned_amount = float(budget.planned_amount)
        deviation_percent = abs((actual_amount - planned_amount) / planned_amount * 100) if planned_amount > 0 else 0
        
        # Создаем уведомление, если отклонение больше 20%
        if deviation_percent > 20:
            # Получаем всех пользователей (в реальности можно фильтровать по правам доступа)
            users = db.query(User).filter(User.is_active == True).all()
            
            for user in users:
                notification = create_notification(
                    db,
                    user.id,
                    "warning",
                    f"Отклонение от бюджета: {budget.period_value}",
                    f"Фактическое значение отклоняется от плана на {deviation_percent:.1f}%. План: {planned_amount:.2f} ₽, Факт: {actual_amount:.2f} ₽",
                    "budgets",
                    budget.id
                )
                notifications_created.append(notification)
    
    return notifications_created

def check_low_profitability(db: Session, threshold: float = 5.0):
    """Проверить низкую рентабельность и создать уведомления"""
    from app.api.profit_loss import get_profit_loss_report
    from datetime import date
    
    # Получаем отчет за текущий месяц
    today = date.today()
    start_date = date(today.year, today.month, 1)
    
    # Здесь нужно получить данные из ОПУ
    # Упрощенная версия - проверяем через API
    # В реальности лучше напрямую обращаться к моделям
    
    return []

def check_negative_balance(db: Session):
    """Проверить отрицательный баланс и создать уведомления"""
    from app.api.balance import get_balance
    from datetime import date
    
    # Получаем баланс на сегодня
    balance_date = date.today()
    
    # Здесь нужно получить данные баланса
    # Упрощенная версия
    
    return []

