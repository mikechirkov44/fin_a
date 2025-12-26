from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input2 import Asset, Liability
from app.models.input1 import MoneyMovement
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_balance(
    balance_date: date | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Расчет баланса на указанную дату или текущую дату
    """
    if not balance_date:
        balance_date = date.today()
    
    # Активы
    current_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "current",
        Asset.date <= balance_date
    )
    if company_id:
        current_assets_query = current_assets_query.filter(Asset.company_id == company_id)
    current_assets = current_assets_query.scalar() or 0
    
    # Дебиторская задолженность (тоже оборотные активы)
    receivable_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "receivable",
        Asset.date <= balance_date
    )
    if company_id:
        receivable_assets_query = receivable_assets_query.filter(Asset.company_id == company_id)
    receivable_assets = receivable_assets_query.scalar() or 0
    
    fixed_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "fixed",
        Asset.date <= balance_date
    )
    if company_id:
        fixed_assets_query = fixed_assets_query.filter(Asset.company_id == company_id)
    fixed_assets = fixed_assets_query.scalar() or 0
    
    intangible_assets_query = db.query(func.sum(Asset.value)).filter(
        Asset.category == "intangible",
        Asset.date <= balance_date
    )
    if company_id:
        intangible_assets_query = intangible_assets_query.filter(Asset.company_id == company_id)
    intangible_assets = intangible_assets_query.scalar() or 0
    
    # Дебиторская задолженность включается в оборотные активы
    total_current_assets = float(current_assets) + float(receivable_assets)
    total_assets = total_current_assets + float(fixed_assets) + float(intangible_assets)
    
    # Обязательства
    short_term_liabilities_query = db.query(func.sum(Liability.value)).filter(
        Liability.category == "short_term",
        Liability.date <= balance_date
    )
    if company_id:
        short_term_liabilities_query = short_term_liabilities_query.filter(Liability.company_id == company_id)
    short_term_liabilities = short_term_liabilities_query.scalar() or 0
    
    # Кредиторская задолженность (тоже краткосрочные обязательства)
    payable_liabilities_query = db.query(func.sum(Liability.value)).filter(
        Liability.category == "payable",
        Liability.date <= balance_date
    )
    if company_id:
        payable_liabilities_query = payable_liabilities_query.filter(Liability.company_id == company_id)
    payable_liabilities = payable_liabilities_query.scalar() or 0
    
    long_term_liabilities_query = db.query(func.sum(Liability.value)).filter(
        Liability.category == "long_term",
        Liability.date <= balance_date
    )
    if company_id:
        long_term_liabilities_query = long_term_liabilities_query.filter(Liability.company_id == company_id)
    long_term_liabilities = long_term_liabilities_query.scalar() or 0
    
    # Кредиторская задолженность включается в краткосрочные обязательства
    total_short_term_liabilities = float(short_term_liabilities) + float(payable_liabilities)
    total_liabilities = total_short_term_liabilities + float(long_term_liabilities)
    
    # Капитал (разница между активами и обязательствами)
    equity = total_assets - total_liabilities
    
    # Денежные средства (из движения денег)
    income_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "income",
        MoneyMovement.is_business == True,
        MoneyMovement.date <= balance_date
    )
    if company_id:
        income_query = income_query.filter(MoneyMovement.company_id == company_id)
    total_income = income_query.scalar() or 0
    
    expense_query = db.query(func.sum(MoneyMovement.amount)).filter(
        MoneyMovement.movement_type == "expense",
        MoneyMovement.is_business == True,
        MoneyMovement.date <= balance_date
    )
    if company_id:
        expense_query = expense_query.filter(MoneyMovement.company_id == company_id)
    total_expense = expense_query.scalar() or 0
    
    cash_balance = float(total_income) - float(total_expense)
    
    # Детализация активов (группируем по имени, суммируем значения)
    assets_detail_query = db.query(Asset).filter(Asset.date <= balance_date)
    if company_id:
        assets_detail_query = assets_detail_query.filter(Asset.company_id == company_id)
    assets_detail = assets_detail_query.order_by(Asset.category, Asset.name, Asset.date).all()
    
    assets_by_category = {
        "current": {},
        "receivable": {},
        "fixed": {},
        "intangible": {}
    }
    
    # Группируем активы по имени и категории, суммируем значения
    for asset in assets_detail:
        category = asset.category
        name = asset.name
        if name not in assets_by_category[category]:
            assets_by_category[category][name] = {
                "id": asset.id,  # Берем первый ID
                "name": name,
                "value": 0.0,
                "date": asset.date.isoformat(),
                "company": asset.company.name if asset.company else "",
                "description": asset.description
            }
        assets_by_category[category][name]["value"] += float(asset.value)
    
    # Преобразуем словари в списки
    assets_by_category_list = {
        "current": list(assets_by_category["current"].values()),
        "receivable": list(assets_by_category["receivable"].values()),
        "fixed": list(assets_by_category["fixed"].values()),
        "intangible": list(assets_by_category["intangible"].values())
    }
    
    # Детализация обязательств (группируем по имени, суммируем значения)
    liabilities_detail_query = db.query(Liability).filter(Liability.date <= balance_date)
    if company_id:
        liabilities_detail_query = liabilities_detail_query.filter(Liability.company_id == company_id)
    liabilities_detail = liabilities_detail_query.order_by(Liability.category, Liability.name, Liability.date).all()
    
    liabilities_by_category = {
        "short_term": {},
        "payable": {},
        "long_term": {}
    }
    
    # Группируем обязательства по имени и категории, суммируем значения
    for liability in liabilities_detail:
        category = liability.category
        name = liability.name
        if name not in liabilities_by_category[category]:
            liabilities_by_category[category][name] = {
                "id": liability.id,  # Берем первый ID
                "name": name,
                "value": 0.0,
                "date": liability.date.isoformat(),
                "company": liability.company.name if liability.company else "",
                "description": liability.description
            }
        liabilities_by_category[category][name]["value"] += float(liability.value)
    
    # Преобразуем словари в списки
    liabilities_by_category_list = {
        "short_term": list(liabilities_by_category["short_term"].values()),
        "payable": list(liabilities_by_category["payable"].values()),
        "long_term": list(liabilities_by_category["long_term"].values())
    }
    
    return {
        "balance_date": balance_date,
        "assets": {
            "current": total_current_assets,  # Включает оборотные + дебиторскую задолженность
            "receivable": float(receivable_assets),
            "fixed": float(fixed_assets),
            "intangible": float(intangible_assets),
            "total": total_assets,
            "detail": assets_by_category_list
        },
        "liabilities": {
            "short_term": total_short_term_liabilities,  # Включает краткосрочные + кредиторскую задолженность
            "payable": float(payable_liabilities),
            "long_term": float(long_term_liabilities),
            "total": total_liabilities,
            "detail": liabilities_by_category_list
        },
        "equity": equity,
        "cash_balance": cash_balance
    }

