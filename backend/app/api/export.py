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
            "Место оплаты": m.payment_place.name if m.payment_place else "",
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
            "Маркетплейс": r.marketplace,
            "Выручка": float(r.revenue),
            "Количество": r.quantity,
            "Описание": r.description or "",
        })
    
    df = pd.DataFrame(data)
    return export_dataframe(df, "realizations", format)

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

