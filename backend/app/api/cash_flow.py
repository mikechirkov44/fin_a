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
    company_id: int | None = Query(None),
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
    
    # Логирование для отладки
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Cash flow request: start_date={start_date}, end_date={end_date}, group_by={group_by}, user={current_user.username}")
    
    # Получаем все движения денег в периоде
    query = db.query(MoneyMovement).filter(
        MoneyMovement.date >= start_date,
        MoneyMovement.date <= end_date,
        MoneyMovement.is_business == True
    )
    if company_id:
        query = query.filter(MoneyMovement.company_id == company_id)
    movements = query.order_by(MoneyMovement.date).all()
    
    logger.info(f"Found {len(movements)} movements in period")
    
    if len(movements) == 0:
        logger.warning(f"No movements found for period {start_date} to {end_date}")
        return {
            "start_date": start_date,
            "end_date": end_date,
            "group_by": group_by,
            "periods": [],
            "totals": {
                "income": 0,
                "expense": 0,
                "net": 0
            }
        }
    
    # Группировка по периодам
    periods = {}
    
    for movement in movements:
        if group_by == "month":
            period_key = movement.date.strftime("%Y-%m")
            # Используем русские названия месяцев
            months_ru = ["январь", "февраль", "март", "апрель", "май", "июнь",
                        "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"]
            period_label = f"{months_ru[movement.date.month - 1].capitalize()} {movement.date.year}"
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
    
    # Преобразуем в список и сортируем по period_key (для правильной сортировки)
    # Создаем список с period_key для сортировки
    result_list = []
    for period_key in sorted(periods.keys()):
        result_list.append(periods[period_key])
    
    # Общие итоги
    total_income = sum(p["income"] for p in result_list)
    total_expense = sum(p["expense"] for p in result_list)
    total_net = total_income - total_expense
    
    logger.info(f"Returning {len(result_list)} periods, totals: income={total_income}, expense={total_expense}, net={total_net}")
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "group_by": group_by,
        "periods": result_list,
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
    company_id: int | None = Query(None),
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
            query = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.income_item_id == item.id,
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            )
            if company_id:
                query = query.filter(MoneyMovement.company_id == company_id)
            total = query.scalar() or 0
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
            query = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.expense_item_id == item.id,
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            )
            if company_id:
                query = query.filter(MoneyMovement.company_id == company_id)
            total = query.scalar() or 0
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

@router.get("/by-group")
def get_cash_flow_by_group(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    movement_type: str = Query(..., regex="^(income|expense)$"),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Движение денег по группам статей доходов/расходов
    """
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
    
    from app.models.reference import IncomeGroup, ExpenseGroup, IncomeItem, ExpenseItem
    
    if movement_type == "income":
        # Получаем родительские группы (без parent_group_id) и подгруппы
        parent_groups = db.query(IncomeGroup).filter(
            IncomeGroup.is_active == True,
            IncomeGroup.parent_group_id == None
        ).all()
        result = []
        
        for parent_group in parent_groups:
            # Получаем подгруппы этой родительской группы
            subgroups = db.query(IncomeGroup).filter(
                IncomeGroup.is_active == True,
                IncomeGroup.parent_group_id == parent_group.id
            ).all()
            
            parent_total = 0
            subgroups_data = []
            
            # Обрабатываем подгруппы
            for subgroup in subgroups:
                if subgroup.subgroup_type != "income":
                    continue
                    
                # Получаем статьи этой подгруппы
                items = db.query(IncomeItem).filter(
                    IncomeItem.group_id == subgroup.id,
                    IncomeItem.is_active == True
                ).all()
                
                if not items:
                    continue
                
                item_ids = [item.id for item in items]
                
                # Суммируем движения по статьям этой подгруппы
                query = db.query(func.sum(MoneyMovement.amount)).filter(
                    MoneyMovement.income_item_id.in_(item_ids),
                    MoneyMovement.date >= start_date,
                    MoneyMovement.date <= end_date,
                    MoneyMovement.is_business == True
                )
                if company_id:
                    query = query.filter(MoneyMovement.company_id == company_id)
                subgroup_total = query.scalar() or 0
                
                if subgroup_total > 0:
                    # Детализация по статьям в подгруппе
                    items_detail = []
                    for item in items:
                        item_query = db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.income_item_id == item.id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= end_date,
                            MoneyMovement.is_business == True
                        )
                        if company_id:
                            item_query = item_query.filter(MoneyMovement.company_id == company_id)
                        item_total = item_query.scalar() or 0
                        if item_total > 0:
                            items_detail.append({
                                "id": item.id,
                                "name": item.name,
                                "amount": float(item_total)
                            })
                    
                    subgroups_data.append({
                        "id": subgroup.id,
                        "name": subgroup.name,
                        "amount": float(subgroup_total),
                        "items": sorted(items_detail, key=lambda x: x["amount"], reverse=True)
                    })
                    parent_total += float(subgroup_total)
            
            # Если нет подгрупп, проверяем статьи напрямую в родительской группе
            if not subgroups_data:
                items = db.query(IncomeItem).filter(
                    IncomeItem.group_id == parent_group.id,
                    IncomeItem.is_active == True
                ).all()
                
                if items:
                    item_ids = [item.id for item in items]
                    query = db.query(func.sum(MoneyMovement.amount)).filter(
                        MoneyMovement.income_item_id.in_(item_ids),
                        MoneyMovement.date >= start_date,
                        MoneyMovement.date <= end_date,
                        MoneyMovement.is_business == True
                    )
                    if company_id:
                        query = query.filter(MoneyMovement.company_id == company_id)
                    parent_total = query.scalar() or 0
                    
                    if parent_total > 0:
                        items_detail = []
                        for item in items:
                            item_query = db.query(func.sum(MoneyMovement.amount)).filter(
                                MoneyMovement.income_item_id == item.id,
                                MoneyMovement.date >= start_date,
                                MoneyMovement.date <= end_date,
                                MoneyMovement.is_business == True
                            )
                            if company_id:
                                item_query = item_query.filter(MoneyMovement.company_id == company_id)
                            item_total = item_query.scalar() or 0
                            if item_total > 0:
                                items_detail.append({
                                    "id": item.id,
                                    "name": item.name,
                                    "amount": float(item_total)
                                })
                        
                        result.append({
                            "id": parent_group.id,
                            "name": parent_group.name,
                            "amount": float(parent_total),
                            "items": sorted(items_detail, key=lambda x: x["amount"], reverse=True),
                            "subgroups": []
                        })
            else:
                # Есть подгруппы
                result.append({
                    "id": parent_group.id,
                    "name": parent_group.name,
                    "amount": parent_total,
                    "items": [],
                    "subgroups": sorted(subgroups_data, key=lambda x: x["amount"], reverse=True)
                })
    else:
        # Получаем родительские группы расходов (без parent_group_id) и подгруппы
        parent_groups = db.query(ExpenseGroup).filter(
            ExpenseGroup.is_active == True,
            ExpenseGroup.parent_group_id == None
        ).all()
        result = []
        
        for parent_group in parent_groups:
            # Получаем подгруппы этой родительской группы
            subgroups = db.query(ExpenseGroup).filter(
                ExpenseGroup.is_active == True,
                ExpenseGroup.parent_group_id == parent_group.id
            ).all()
            
            parent_total = 0
            subgroups_data = []
            
            # Обрабатываем подгруппы
            for subgroup in subgroups:
                if subgroup.subgroup_type != "expense":
                    continue
                    
                # Получаем статьи этой подгруппы
                items = db.query(ExpenseItem).filter(
                    ExpenseItem.group_id == subgroup.id,
                    ExpenseItem.is_active == True
                ).all()
                
                if not items:
                    continue
                
                item_ids = [item.id for item in items]
                
                # Суммируем движения по статьям этой подгруппы
                query = db.query(func.sum(MoneyMovement.amount)).filter(
                    MoneyMovement.expense_item_id.in_(item_ids),
                    MoneyMovement.date >= start_date,
                    MoneyMovement.date <= end_date,
                    MoneyMovement.is_business == True
                )
                if company_id:
                    query = query.filter(MoneyMovement.company_id == company_id)
                subgroup_total = query.scalar() or 0
                
                if subgroup_total > 0:
                    # Детализация по статьям в подгруппе
                    items_detail = []
                    for item in items:
                        item_query = db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.expense_item_id == item.id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= end_date,
                            MoneyMovement.is_business == True
                        )
                        if company_id:
                            item_query = item_query.filter(MoneyMovement.company_id == company_id)
                        item_total = item_query.scalar() or 0
                        if item_total > 0:
                            items_detail.append({
                                "id": item.id,
                                "name": item.name,
                                "amount": float(item_total)
                            })
                    
                    subgroups_data.append({
                        "id": subgroup.id,
                        "name": subgroup.name,
                        "amount": float(subgroup_total),
                        "items": sorted(items_detail, key=lambda x: x["amount"], reverse=True)
                    })
                    parent_total += float(subgroup_total)
            
            # Если нет подгрупп, проверяем статьи напрямую в родительской группе
            if not subgroups_data:
                items = db.query(ExpenseItem).filter(
                    ExpenseItem.group_id == parent_group.id,
                    ExpenseItem.is_active == True
                ).all()
                
                if items:
                    item_ids = [item.id for item in items]
                    query = db.query(func.sum(MoneyMovement.amount)).filter(
                        MoneyMovement.expense_item_id.in_(item_ids),
                        MoneyMovement.date >= start_date,
                        MoneyMovement.date <= end_date,
                        MoneyMovement.is_business == True
                    )
                    if company_id:
                        query = query.filter(MoneyMovement.company_id == company_id)
                    parent_total = query.scalar() or 0
                    
                    if parent_total > 0:
                        items_detail = []
                        for item in items:
                            item_query = db.query(func.sum(MoneyMovement.amount)).filter(
                                MoneyMovement.expense_item_id == item.id,
                                MoneyMovement.date >= start_date,
                                MoneyMovement.date <= end_date,
                                MoneyMovement.is_business == True
                            )
                            if company_id:
                                item_query = item_query.filter(MoneyMovement.company_id == company_id)
                            item_total = item_query.scalar() or 0
                            if item_total > 0:
                                items_detail.append({
                                    "id": item.id,
                                    "name": item.name,
                                    "amount": float(item_total)
                                })
                        
                        result.append({
                            "id": parent_group.id,
                            "name": parent_group.name,
                            "amount": float(parent_total),
                            "items": sorted(items_detail, key=lambda x: x["amount"], reverse=True),
                            "subgroups": []
                        })
            else:
                # Есть подгруппы
                result.append({
                    "id": parent_group.id,
                    "name": parent_group.name,
                    "amount": parent_total,
                    "items": [],
                    "subgroups": sorted(subgroups_data, key=lambda x: x["amount"], reverse=True)
                })
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "movement_type": movement_type,
        "groups": sorted(result, key=lambda x: x["amount"], reverse=True)
    }

