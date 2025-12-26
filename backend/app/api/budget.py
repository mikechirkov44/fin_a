from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func as sql_func
from datetime import datetime, date
from typing import List, Optional
import logging
from app.database import get_db
from app.models.user import User
from app.models.budget import Budget, BudgetType, BudgetPeriod
from app.models.input1 import MoneyMovement
from app.models.reference import Company, IncomeItem, ExpenseItem
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetComparison
from app.auth.security import get_current_user
from app.utils.audit_logger import log_create, log_update, log_delete

router = APIRouter()

@router.get("/", response_model=List[BudgetResponse])
def get_budgets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    company_id: Optional[int] = Query(None),
    period_type: Optional[str] = Query(None),
    period_value: Optional[str] = Query(None),
    budget_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список бюджетов с фильтрацией"""
    query = db.query(Budget)
    
    if company_id:
        query = query.filter(Budget.company_id == company_id)
    if period_type:
        try:
            query = query.filter(Budget.period_type == BudgetPeriod(period_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period_type: {period_type}")
    if period_value:
        query = query.filter(Budget.period_value == period_value)
    if budget_type:
        try:
            query = query.filter(Budget.budget_type == BudgetType(budget_type))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid budget_type: {budget_type}")
    
    budgets = query.order_by(Budget.period_value.desc(), Budget.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for budget in budgets:
        try:
            company = db.query(Company).filter(Company.id == budget.company_id).first()
            item_name = None
            if budget.income_item_id:
                item = db.query(IncomeItem).filter(IncomeItem.id == budget.income_item_id).first()
                item_name = item.name if item else None
            elif budget.expense_item_id:
                item = db.query(ExpenseItem).filter(ExpenseItem.id == budget.expense_item_id).first()
                item_name = item.name if item else None
            
            # Безопасное получение значений enum'ов
            # Enum'ы не должны быть None в БД, но на всякий случай проверяем
            if not budget.period_type:
                raise ValueError(f"Budget {budget.id} has None period_type")
            if not budget.budget_type:
                raise ValueError(f"Budget {budget.id} has None budget_type")
            
            period_type_value = budget.period_type.value
            budget_type_value = budget.budget_type.value
            
            # Валидация данных перед созданием ответа
            if period_type_value is None:
                raise ValueError(f"Budget {budget.id} has None period_type")
            if budget_type_value is None:
                raise ValueError(f"Budget {budget.id} has None budget_type")
            if budget.period_value is None:
                raise ValueError(f"Budget {budget.id} has None period_value")
            
            result.append(BudgetResponse(
                id=budget.id,
                company_id=budget.company_id,
                period_type=period_type_value,
                period_value=budget.period_value,
                budget_type=budget_type_value,
                income_item_id=budget.income_item_id,
                expense_item_id=budget.expense_item_id,
                planned_amount=float(budget.planned_amount) if budget.planned_amount is not None else 0.0,
                description=budget.description,
                created_at=budget.created_at,
                updated_at=budget.updated_at,
                company_name=company.name if company else None,
                item_name=item_name
            ))
        except Exception as e:
            # Логируем ошибку с полной информацией
            logging.error(f"Error processing budget {budget.id if budget else 'unknown'}: {str(e)}", exc_info=True)
            # Пропускаем проблемные записи, чтобы не падал весь запрос
            continue
    
    return result

@router.post("/", response_model=BudgetResponse)
def create_budget(
    budget: BudgetCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новый бюджет"""
    try:
        # Валидация
        if budget.budget_type == "income" and not budget.income_item_id:
            raise HTTPException(status_code=400, detail="Income item is required for income budget")
        if budget.budget_type == "expense" and not budget.expense_item_id:
            raise HTTPException(status_code=400, detail="Expense item is required for expense budget")
        
        # Проверка и конвертация enum'ов
        try:
            period_type_enum = BudgetPeriod(budget.period_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period_type: {budget.period_type}")
        
        try:
            budget_type_enum = BudgetType(budget.budget_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid budget_type: {budget.budget_type}")
        
        # Проверка на дубликат
        existing = db.query(Budget).filter(
            and_(
                Budget.company_id == budget.company_id,
                Budget.period_type == period_type_enum,
                Budget.period_value == budget.period_value,
                Budget.budget_type == budget_type_enum,
                Budget.income_item_id == budget.income_item_id,
                Budget.expense_item_id == budget.expense_item_id
            )
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Budget already exists for this period and item")
        
        db_budget = Budget(
            company_id=budget.company_id,
            period_type=period_type_enum,
            period_value=budget.period_value,
            budget_type=budget_type_enum,
            income_item_id=budget.income_item_id,
            expense_item_id=budget.expense_item_id,
            planned_amount=budget.planned_amount,
            description=budget.description
        )
        db.add(db_budget)
        db.commit()
        db.refresh(db_budget)
    except HTTPException:
        # Пробрасываем HTTP исключения дальше
        raise
    except Exception as e:
        # Логируем другие ошибки и возвращаем 500
        logging.error(f"Error creating budget: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating budget: {str(e)}")
    
    # Логирование (в try-except, чтобы не сломать создание при ошибке логирования)
    try:
        ip_address = request.client.host if request.client else None
        log_create(db, db_budget, current_user.id,
                   description=f"Создан бюджет: {budget.budget_type}, период: {budget.period_value}, сумма: {budget.planned_amount}",
                   ip_address=ip_address)
    except Exception as e:
        logging.error(f"Error logging budget creation: {str(e)}", exc_info=True)
        # Продолжаем выполнение, даже если логирование не удалось
    
    try:
        company = db.query(Company).filter(Company.id == db_budget.company_id).first()
        item_name = None
        if db_budget.income_item_id:
            item = db.query(IncomeItem).filter(IncomeItem.id == db_budget.income_item_id).first()
            item_name = item.name if item else None
        elif db_budget.expense_item_id:
            item = db.query(ExpenseItem).filter(ExpenseItem.id == db_budget.expense_item_id).first()
            item_name = item.name if item else None
        
        # Проверка enum'ов перед получением value
        if not db_budget.period_type:
            raise ValueError("period_type is None")
        if not db_budget.budget_type:
            raise ValueError("budget_type is None")
        
        return BudgetResponse(
            id=db_budget.id,
            company_id=db_budget.company_id,
            period_type=db_budget.period_type.value,
            period_value=db_budget.period_value,
            budget_type=db_budget.budget_type.value,
            income_item_id=db_budget.income_item_id,
            expense_item_id=db_budget.expense_item_id,
            planned_amount=float(db_budget.planned_amount) if db_budget.planned_amount is not None else 0.0,
            description=db_budget.description,
            created_at=db_budget.created_at,
            updated_at=db_budget.updated_at,
            company_name=company.name if company else None,
            item_name=item_name
        )
    except Exception as e:
        logging.error(f"Error creating BudgetResponse: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating response: {str(e)}")

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget: BudgetUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить бюджет"""
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    from app.utils.audit_logger import model_to_dict
    old_values = model_to_dict(db_budget)
    
    if budget.planned_amount is not None:
        db_budget.planned_amount = budget.planned_amount
    if budget.description is not None:
        db_budget.description = budget.description
    
    db.commit()
    db.refresh(db_budget)
    
    # Логирование
    ip_address = request.client.host if request.client else None
    log_update(db, db_budget, current_user.id, old_values=old_values,
               description=f"Обновлен бюджет ID: {budget_id}",
               ip_address=ip_address)
    
    company = db.query(Company).filter(Company.id == db_budget.company_id).first()
    item_name = None
    if db_budget.income_item_id:
        item = db.query(IncomeItem).filter(IncomeItem.id == db_budget.income_item_id).first()
        item_name = item.name if item else None
    elif db_budget.expense_item_id:
        item = db.query(ExpenseItem).filter(ExpenseItem.id == db_budget.expense_item_id).first()
        item_name = item.name if item else None
    
    return BudgetResponse(
        id=db_budget.id,
        company_id=db_budget.company_id,
        period_type=db_budget.period_type.value,
        period_value=db_budget.period_value,
        budget_type=db_budget.budget_type.value,
        income_item_id=db_budget.income_item_id,
        expense_item_id=db_budget.expense_item_id,
        planned_amount=float(db_budget.planned_amount),
        description=db_budget.description,
        created_at=db_budget.created_at,
        updated_at=db_budget.updated_at,
        company_name=company.name if company else None,
        item_name=item_name
    )

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить бюджет"""
    db_budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Логирование
    ip_address = request.client.host if request.client else None
    log_delete(db, db_budget, current_user.id,
               description=f"Удален бюджет ID: {budget_id}",
               ip_address=ip_address)
    
    db.delete(db_budget)
    db.commit()
    return {"message": "Budget deleted"}

@router.get("/comparison", response_model=List[BudgetComparison])
def get_budget_comparison(
    company_id: Optional[int] = Query(None),
    period_type: Optional[str] = Query(None),
    period_value: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить сравнение плана и факта"""
    query = db.query(Budget)
    
    if company_id:
        query = query.filter(Budget.company_id == company_id)
    if period_type:
        query = query.filter(Budget.period_type == BudgetPeriod(period_type))
    if period_value:
        query = query.filter(Budget.period_value == period_value)
    
    budgets = query.all()
    result = []
    
    for budget in budgets:
        # Определяем период для факта
        start_date, end_date = _get_period_dates(budget.period_type, budget.period_value)
        
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
        else:  # EXPENSE
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
        deviation = actual_amount - planned_amount
        deviation_percent = (deviation / planned_amount * 100) if planned_amount > 0 else 0
        
        # Получаем название статьи
        item_name = None
        item_id = None
        if budget.income_item_id:
            item = db.query(IncomeItem).filter(IncomeItem.id == budget.income_item_id).first()
            item_name = item.name if item else None
            item_id = budget.income_item_id
        elif budget.expense_item_id:
            item = db.query(ExpenseItem).filter(ExpenseItem.id == budget.expense_item_id).first()
            item_name = item.name if item else None
            item_id = budget.expense_item_id
        
        result.append(BudgetComparison(
            budget_id=budget.id,
            period_type=budget.period_type.value,
            period_value=budget.period_value,
            budget_type=budget.budget_type.value,
            item_id=item_id,
            item_name=item_name,
            planned_amount=planned_amount,
            actual_amount=actual_amount,
            deviation=deviation,
            deviation_percent=deviation_percent
        ))
    
    return result

def _get_period_dates(period_type: BudgetPeriod, period_value: str) -> tuple[date, date]:
    """Получить начальную и конечную даты периода"""
    if period_type == BudgetPeriod.MONTH:
        # period_value = "2024-01"
        year, month = map(int, period_value.split("-"))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        # Вычитаем один день для конечной даты
        from datetime import timedelta
        end_date = end_date - timedelta(days=1)
    elif period_type == BudgetPeriod.QUARTER:
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
        from datetime import timedelta
        end_date = end_date - timedelta(days=1)
    else:  # YEAR
        # period_value = "2024"
        year = int(period_value)
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
    
    return start_date, end_date

