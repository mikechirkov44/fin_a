from fastapi import APIRouter, Depends, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import date
from io import BytesIO
import pandas as pd
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.input2 import Asset, Liability
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.models.product import Product
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/money-movements")
def export_money_movements(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт движения денег"""
    query = db.query(MoneyMovement)
    if start_date:
        query = query.filter(MoneyMovement.date >= start_date)
    if end_date:
        query = query.filter(MoneyMovement.date <= end_date)
    
    movements = query.order_by(MoneyMovement.date).all()
    
    data = []
    for m in movements:
        data.append({
            "Дата": m.date,
            "Тип": "Поступление" if m.movement_type == "income" else "Оплата",
            "Сумма": float(m.amount),
            "Статья дохода": m.income_item.name if m.income_item else "",
            "Статья расхода": m.expense_item.name if m.expense_item else "",
            "Счет списания": m.payment_place.name if m.payment_place else "",
            "Бизнес": "Да" if m.is_business else "Нет",
            "Описание": m.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "money_movements", format)

@router.get("/realizations")
def export_realizations(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт реализации"""
    query = db.query(Realization)
    if start_date:
        query = query.filter(Realization.date >= start_date)
    if end_date:
        query = query.filter(Realization.date <= end_date)
    
    realizations = query.order_by(Realization.date).all()
    
    data = []
    for r in realizations:
        data.append({
            "Дата": r.date,
            "Маркетплейс": r.marketplace.name if r.marketplace else "",
            "Выручка": float(r.revenue),
            "Количество": r.quantity,
            "Организация": r.company.name if r.company else "",
            "Описание": r.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "realizations", format)

@router.get("/shipments")
def export_shipments(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт отгрузок"""
    query = db.query(Shipment)
    if start_date:
        query = query.filter(Shipment.date >= start_date)
    if end_date:
        query = query.filter(Shipment.date <= end_date)
    
    shipments = query.order_by(Shipment.date).all()
    
    data = []
    for s in shipments:
        data.append({
            "Дата": s.date,
            "Товар": s.product.name if s.product else "",
            "SKU": s.product.sku if s.product else "",
            "Маркетплейс": s.marketplace.name if s.marketplace else "",
            "Количество": s.quantity,
            "Себестоимость (ед.)": float(s.cost_price),
            "Итого": float(s.cost_price * s.quantity),
            "Организация": s.company.name if s.company else "",
            "Описание": s.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "shipments", format)

@router.get("/products")
def export_products(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт товаров"""
    products = db.query(Product).filter(Product.is_active == True).all()
    
    data = []
    for p in products:
        data.append({
            "Наименование": p.name,
            "Артикул": p.sku,
            "Себестоимость": float(p.cost_price),
            "Цена продажи": float(p.selling_price) if p.selling_price else "",
            "Описание": p.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "products", format)

@router.get("/assets")
def export_assets(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт активов"""
    query = db.query(Asset)
    if start_date:
        query = query.filter(Asset.date >= start_date)
    if end_date:
        query = query.filter(Asset.date <= end_date)
    
    assets = query.order_by(Asset.date).all()
    
    data = []
    for a in assets:
        category_map = {
            'current': 'Оборотные',
            'receivable': 'Дебиторская задолженность',
            'fixed': 'Основные средства',
            'intangible': 'Нематериальные'
        }
        data.append({
            "Дата": a.date,
            "Наименование": a.name,
            "Категория": category_map.get(a.category, a.category),
            "Стоимость": float(a.value),
            "Организация": a.company.name if a.company else "",
            "Описание": a.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "assets", format)

@router.get("/liabilities")
def export_liabilities(
    format: str = Query("xlsx", regex="^(xlsx|csv)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Экспорт обязательств"""
    query = db.query(Liability)
    if start_date:
        query = query.filter(Liability.date >= start_date)
    if end_date:
        query = query.filter(Liability.date <= end_date)
    
    liabilities = query.order_by(Liability.date).all()
    
    data = []
    for l in liabilities:
        category_map = {
            'short_term': 'Краткосрочные',
            'payable': 'Кредиторская задолженность',
            'long_term': 'Долгосрочные'
        }
        data.append({
            "Дата": l.date,
            "Наименование": l.name,
            "Категория": category_map.get(l.category, l.category),
            "Стоимость": float(l.value),
            "Организация": l.company.name if l.company else "",
            "Описание": l.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "liabilities", format)

def export_dataframe(df: pd.DataFrame, filename: str, format: str):
    """Универсальная функция экспорта"""
    if format == "xlsx":
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Data')
        output.seek(0)
        return StreamingResponse(
            BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    else:  # csv
        output = BytesIO()
        df.to_csv(output, index=False, encoding='utf-8-sig')
        output.seek(0)
        return StreamingResponse(
            BytesIO(output.read()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

