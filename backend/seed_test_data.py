"""
Скрипт для заполнения системы тестовыми данными для пользователя testlogin
"""
import sys
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import (
    User, IncomeItem, ExpenseItem, PaymentPlace,
    MoneyMovement, Asset, Liability, Product,
    Realization, Shipment
)
from app.auth.security import get_password_hash

def get_or_create_user(db: Session):
    """Получить или создать пользователя testlogin"""
    user = db.query(User).filter(User.username == "testlogin").first()
    if not user:
        user = User(
            username="testlogin",
            email="test@example.com",
            hashed_password=get_password_hash("testpassword"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[OK] Создан пользователь: {user.username}")
    else:
        print(f"[OK] Пользователь уже существует: {user.username}")
    return user

def seed_reference_data(db: Session):
    """Заполнить справочники"""
    print("\n[INFO] Заполнение справочников...")
    
    # Статьи доходов
    income_items = [
        {"name": "Продажа товаров", "description": "Доходы от продажи товаров"},
        {"name": "Услуги", "description": "Доходы от оказания услуг"},
        {"name": "Прочие доходы", "description": "Прочие виды доходов"},
    ]
    
    for item_data in income_items:
        item = db.query(IncomeItem).filter(IncomeItem.name == item_data["name"]).first()
        if not item:
            item = IncomeItem(**item_data)
            db.add(item)
            print(f"  [OK] Создана статья дохода: {item_data['name']}")
    
    # Статьи расходов
    expense_items = [
        {"name": "Закупка товаров", "description": "Расходы на закупку товаров"},
        {"name": "Зарплата", "description": "Расходы на оплату труда"},
        {"name": "Аренда", "description": "Расходы на аренду помещений"},
        {"name": "Реклама", "description": "Расходы на рекламу и маркетинг"},
        {"name": "Коммунальные услуги", "description": "Электричество, вода, интернет"},
        {"name": "Транспорт", "description": "Расходы на транспорт"},
    ]
    
    for item_data in expense_items:
        item = db.query(ExpenseItem).filter(ExpenseItem.name == item_data["name"]).first()
        if not item:
            item = ExpenseItem(**item_data)
            db.add(item)
            print(f"  [OK] Создана статья расхода: {item_data['name']}")
    
    # Места оплаты
    payment_places = [
        {"name": "Расчетный счет", "description": "Основной расчетный счет"},
        {"name": "Наличные", "description": "Наличные средства"},
        {"name": "Карта", "description": "Банковская карта"},
    ]
    
    for place_data in payment_places:
        place = db.query(PaymentPlace).filter(PaymentPlace.name == place_data["name"]).first()
        if not place:
            place = PaymentPlace(**place_data)
            db.add(place)
            print(f"  [OK] Создано место оплаты: {place_data['name']}")
    
    db.commit()
    print("[OK] Справочники заполнены")

def seed_products(db: Session):
    """Заполнить товары"""
    print("\n[INFO] Заполнение товаров...")
    
    products = [
        {"name": "Товар 1", "sku": "SKU-001", "cost_price": Decimal("1000.00"), "selling_price": Decimal("1500.00"), "description": "Описание товара 1"},
        {"name": "Товар 2", "sku": "SKU-002", "cost_price": Decimal("2000.00"), "selling_price": Decimal("3000.00"), "description": "Описание товара 2"},
        {"name": "Товар 3", "sku": "SKU-003", "cost_price": Decimal("500.00"), "selling_price": Decimal("800.00"), "description": "Описание товара 3"},
        {"name": "Товар 4", "sku": "SKU-004", "cost_price": Decimal("3000.00"), "selling_price": Decimal("4500.00"), "description": "Описание товара 4"},
        {"name": "Товар 5", "sku": "SKU-005", "cost_price": Decimal("1500.00"), "selling_price": Decimal("2200.00"), "description": "Описание товара 5"},
    ]
    
    for product_data in products:
        product = db.query(Product).filter(Product.sku == product_data["sku"]).first()
        if not product:
            product = Product(**product_data)
            db.add(product)
            print(f"  [OK] Создан товар: {product_data['name']} ({product_data['sku']})")
    
    db.commit()
    print("[OK] Товары заполнены")

def seed_money_movements(db: Session):
    """Заполнить движение денег"""
    print("\n[INFO] Заполнение движения денег...")
    
    # Получаем справочники
    income_item = db.query(IncomeItem).filter(IncomeItem.name == "Продажа товаров").first()
    expense_item = db.query(ExpenseItem).filter(ExpenseItem.name == "Закупка товаров").first()
    payment_place = db.query(PaymentPlace).filter(PaymentPlace.name == "Расчетный счет").first()
    
    if not income_item or not expense_item or not payment_place:
        print("  [WARN] Справочники не найдены, пропускаем движение денег")
        return
    
    # Генерируем данные за последние 3 месяца
    today = date.today()
    movements = []
    
    # Доходы
    for i in range(30):
        movement_date = today - timedelta(days=i)
        movements.append({
            "date": movement_date,
            "amount": Decimal("50000.00") + Decimal(str(i * 1000)),
            "movement_type": "income",
            "income_item_id": income_item.id,
            "payment_place_id": payment_place.id,
            "description": f"Продажа товаров за {movement_date.strftime('%d.%m.%Y')}",
            "is_business": True
        })
    
    # Расходы
    for i in range(25):
        movement_date = today - timedelta(days=i)
        movements.append({
            "date": movement_date,
            "amount": Decimal("20000.00") + Decimal(str(i * 500)),
            "movement_type": "expense",
            "expense_item_id": expense_item.id,
            "payment_place_id": payment_place.id,
            "description": f"Закупка товаров за {movement_date.strftime('%d.%m.%Y')}",
            "is_business": True
        })
    
    # Добавляем другие расходы
    other_expense_items = db.query(ExpenseItem).filter(ExpenseItem.name != "Закупка товаров").all()
    for i, expense_item_other in enumerate(other_expense_items[:3]):
        for j in range(5):
            movement_date = today - timedelta(days=j * 7)
            movements.append({
                "date": movement_date,
                "amount": Decimal("5000.00") + Decimal(str(j * 100)),
                "movement_type": "expense",
                "expense_item_id": expense_item_other.id,
                "payment_place_id": payment_place.id,
                "description": f"{expense_item_other.name} за {movement_date.strftime('%d.%m.%Y')}",
                "is_business": True
            })
    
    count = 0
    for movement_data in movements:
        # Проверяем, нет ли уже такой записи
        existing = db.query(MoneyMovement).filter(
            MoneyMovement.date == movement_data["date"],
            MoneyMovement.amount == movement_data["amount"],
            MoneyMovement.movement_type == movement_data["movement_type"]
        ).first()
        if not existing:
            movement = MoneyMovement(**movement_data)
            db.add(movement)
            count += 1
    
    db.commit()
    print(f"[OK] Создано {count} записей движения денег")

def seed_realizations(db: Session):
    """Заполнить реализации"""
    print("\n[INFO] Заполнение реализаций...")
    
    marketplaces = ["ozon", "wb", "yandex"]
    today = date.today()
    realizations = []
    
    for i in range(20):
        realization_date = today - timedelta(days=i * 2)
        marketplace = marketplaces[i % len(marketplaces)]
        realizations.append({
            "date": realization_date,
            "marketplace": marketplace,
            "revenue": Decimal("30000.00") + Decimal(str(i * 2000)),
            "quantity": 10 + i * 2,
            "description": f"Реализация на {marketplace} за {realization_date.strftime('%d.%m.%Y')}"
        })
    
    count = 0
    for realization_data in realizations:
        existing = db.query(Realization).filter(
            Realization.date == realization_data["date"],
            Realization.marketplace == realization_data["marketplace"]
        ).first()
        if not existing:
            realization = Realization(**realization_data)
            db.add(realization)
            count += 1
    
    db.commit()
    print(f"[OK] Создано {count} записей реализаций")

def seed_assets_liabilities(db: Session):
    """Заполнить активы и обязательства"""
    print("\n[INFO] Заполнение активов и обязательств...")
    
    today = date.today()
    
    # Активы
    assets = [
        {"name": "Денежные средства", "category": "current", "value": Decimal("500000.00"), "date": today, "description": "Остаток на расчетном счете"},
        {"name": "Товарные запасы", "category": "current", "value": Decimal("300000.00"), "date": today, "description": "Стоимость товаров на складе"},
        {"name": "Оборудование", "category": "fixed", "value": Decimal("200000.00"), "date": today, "description": "Офисное оборудование"},
        {"name": "Торговое оборудование", "category": "fixed", "value": Decimal("150000.00"), "date": today, "description": "Торговые стеллажи и витрины"},
    ]
    
    count = 0
    for asset_data in assets:
        existing = db.query(Asset).filter(
            Asset.name == asset_data["name"],
            Asset.date == asset_data["date"]
        ).first()
        if not existing:
            asset = Asset(**asset_data)
            db.add(asset)
            count += 1
    
    # Обязательства
    liabilities = [
        {"name": "Кредиторская задолженность", "category": "short_term", "value": Decimal("100000.00"), "date": today, "description": "Задолженность перед поставщиками"},
        {"name": "Краткосрочный кредит", "category": "short_term", "value": Decimal("200000.00"), "date": today, "description": "Банковский кредит"},
    ]
    
    for liability_data in liabilities:
        existing = db.query(Liability).filter(
            Liability.name == liability_data["name"],
            Liability.date == liability_data["date"]
        ).first()
        if not existing:
            liability = Liability(**liability_data)
            db.add(liability)
            count += 1
    
    db.commit()
    print(f"[OK] Создано {count} записей активов и обязательств")

def seed_shipments(db: Session):
    """Заполнить отгрузки"""
    print("\n[INFO] Заполнение отгрузок...")
    
    products = db.query(Product).limit(3).all()
    if not products:
        print("  [WARN] Товары не найдены, пропускаем отгрузки")
        return
    
    marketplaces = ["ozon", "wb", "yandex"]
    today = date.today()
    shipments = []
    
    for i in range(15):
        shipment_date = today - timedelta(days=i * 3)
        product = products[i % len(products)]
        marketplace = marketplaces[i % len(marketplaces)]
        shipments.append({
            "date": shipment_date,
            "product_id": product.id,
            "marketplace": marketplace,
            "quantity": 5 + i,
            "cost_price": product.cost_price,
            "description": f"Отгрузка товара {product.name} на {marketplace} за {shipment_date.strftime('%d.%m.%Y')}"
        })
    
    try:
        count = 0
        for shipment_data in shipments:
            existing = db.query(Shipment).filter(
                Shipment.date == shipment_data["date"],
                Shipment.product_id == shipment_data["product_id"],
                Shipment.marketplace == shipment_data["marketplace"]
            ).first()
            if not existing:
                shipment = Shipment(**shipment_data)
                db.add(shipment)
                count += 1
        
        db.commit()
        print(f"[OK] Создано {count} записей отгрузок")
    except Exception as e:
        print(f"  [WARN] Ошибка при создании отгрузок: {e}")

def main():
    """Основная функция"""
    print("[START] Начало заполнения тестовыми данными...")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        # Создаем пользователя
        user = get_or_create_user(db)
        
        # Заполняем данные
        seed_reference_data(db)
        seed_products(db)
        seed_money_movements(db)
        seed_realizations(db)
        seed_assets_liabilities(db)
        seed_shipments(db)
        
        print("\n" + "=" * 50)
        print("[SUCCESS] Заполнение тестовыми данными завершено!")
        print(f"Логин: testlogin")
        print(f"Пароль: testpassword")
        
    except Exception as e:
        print(f"\n[ERROR] Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
