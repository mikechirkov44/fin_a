from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.product import Product
from app.models.reference import IncomeItem, ExpenseItem, PaymentPlace
from app.auth.security import get_current_user

router = APIRouter()

@router.post("/money-movements")
async def import_money_movements(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Импорт движения денег"""
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
    
    contents = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), encoding='utf-8-sig')
        else:
            df = pd.read_excel(BytesIO(contents))
        
        # Загружаем справочники
        income_items = {item.name: item.id for item in db.query(IncomeItem).all()}
        expense_items = {item.name: item.id for item in db.query(ExpenseItem).all()}
        payment_places = {place.name: place.id for place in db.query(PaymentPlace).all()}
        
        imported = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Маппинг колонок (можно сделать более гибким)
                date = pd.to_datetime(row.get('Дата', row.get('date'))).date()
                movement_type = "income" if str(row.get('Тип', row.get('type', ''))).lower() in ['поступление', 'income'] else "expense"
                amount = float(row.get('Сумма', row.get('amount', 0)))
                
                income_item_name = str(row.get('Статья дохода', row.get('income_item', ''))).strip()
                expense_item_name = str(row.get('Статья расхода', row.get('expense_item', ''))).strip()
                payment_place_name = str(row.get('Место оплаты', row.get('payment_place', ''))).strip()
                
                income_item_id = income_items.get(income_item_name) if income_item_name and income_item_name != 'nan' else None
                expense_item_id = expense_items.get(expense_item_name) if expense_item_name and expense_item_name != 'nan' else None
                payment_place_id = payment_places.get(payment_place_name)
                
                if not payment_place_id:
                    errors.append(f"Строка {index + 2}: Место оплаты '{payment_place_name}' не найдено")
                    continue
                
                if movement_type == "income" and not income_item_id:
                    errors.append(f"Строка {index + 2}: Статья дохода '{income_item_name}' не найдена")
                    continue
                
                if movement_type == "expense" and not expense_item_id:
                    errors.append(f"Строка {index + 2}: Статья расхода '{expense_item_name}' не найдена")
                    continue
                
                is_business = str(row.get('Бизнес', row.get('is_business', 'Да'))).lower() in ['да', 'yes', 'true', '1']
                description = str(row.get('Описание', row.get('description', ''))).strip()
                
                movement = MoneyMovement(
                    date=date,
                    amount=amount,
                    movement_type=movement_type,
                    income_item_id=income_item_id,
                    expense_item_id=expense_item_id,
                    payment_place_id=payment_place_id,
                    is_business=is_business,
                    description=description if description != 'nan' else None
                )
                db.add(movement)
                imported += 1
            except Exception as e:
                errors.append(f"Строка {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "imported": imported,
            "errors": errors,
            "message": f"Импортировано {imported} записей"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при обработке файла: {str(e)}")

@router.post("/products")
async def import_products(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Импорт товаров"""
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
    
    contents = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(contents), encoding='utf-8-sig')
        else:
            df = pd.read_excel(BytesIO(contents))
        
        imported = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                name = str(row.get('Наименование', row.get('name', ''))).strip()
                sku = str(row.get('Артикул', row.get('sku', ''))).strip()
                cost_price = float(row.get('Себестоимость', row.get('cost_price', 0)))
                selling_price = row.get('Цена продажи', row.get('selling_price'))
                description = str(row.get('Описание', row.get('description', ''))).strip()
                
                if not name or not sku:
                    errors.append(f"Строка {index + 2}: Не указано наименование или артикул")
                    continue
                
                # Проверка на существующий SKU
                existing = db.query(Product).filter(Product.sku == sku).first()
                if existing:
                    errors.append(f"Строка {index + 2}: Товар с артикулом '{sku}' уже существует")
                    continue
                
                product = Product(
                    name=name,
                    sku=sku,
                    cost_price=cost_price,
                    selling_price=float(selling_price) if selling_price and str(selling_price) != 'nan' else None,
                    description=description if description != 'nan' else None
                )
                db.add(product)
                imported += 1
            except Exception as e:
                errors.append(f"Строка {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "imported": imported,
            "errors": errors,
            "message": f"Импортировано {imported} товаров"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при обработке файла: {str(e)}")

