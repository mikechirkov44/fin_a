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
from app.models.reference import Company, Marketplace
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
    
    # Компании
    company = db.query(Company).filter(Company.name == "Основная организация").first()
    if not company:
        company = Company(name="Основная организация", description="Организация по умолчанию")
        db.add(company)
        print(f"  [OK] Создана компания: Основная организация")
    else:
        print(f"  [OK] Компания уже существует: Основная организация")
    
    # Маркетплейсы
    marketplace_names = [("Ozon", "ozon"), ("Wildberries", "wildberries"), ("Яндекс.Маркет", "яндекс.маркет")]
    marketplace_map = {}
    for marketplace_name, marketplace_key in marketplace_names:
        marketplace = db.query(Marketplace).filter(Marketplace.name == marketplace_name).first()
        if not marketplace:
            marketplace = Marketplace(name=marketplace_name, description=f"Маркетплейс {marketplace_name}")
            db.add(marketplace)
            print(f"  [OK] Создан маркетплейс: {marketplace_name}")
        else:
            print(f"  [OK] Маркетплейс уже существует: {marketplace_name}")
        db.commit()
        db.refresh(marketplace)
        marketplace_map[marketplace_key] = marketplace
    
    db.commit()
    db.refresh(company)
    for mp in marketplace_map.values():
        db.refresh(mp)
    print("[OK] Справочники заполнены")
    return company, marketplace_map

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

def seed_money_movements(db: Session, company):
    """Заполнить движение денег"""
    print("\n[INFO] Заполнение движения денег...")
    
    # Получаем справочники
    income_item = db.query(IncomeItem).filter(IncomeItem.name == "Продажа товаров").first()
    expense_item = db.query(ExpenseItem).filter(ExpenseItem.name == "Закупка товаров").first()
    payment_place = db.query(PaymentPlace).filter(PaymentPlace.name == "Расчетный счет").first()
    
    if not income_item or not expense_item or not payment_place or not company:
        print("  [WARN] Справочники не найдены, пропускаем движение денег")
        return
    
    # Генерируем данные за последние 4 месяца (около 120 дней)
    today = date.today()
    movements = []
    days_to_generate = 120
    
    # Доходы (примерно 3-4 раза в неделю)
    for i in range(days_to_generate):
        if i % 2 == 0:  # Каждый второй день
            movement_date = today - timedelta(days=i)
            # Вариация сумм для реалистичности
            base_amount = Decimal("50000.00")
            variation = Decimal(str((i % 7) * 5000))  # Разная сумма в разные дни недели
            movements.append({
                "date": movement_date,
                "amount": base_amount + variation,
                "movement_type": "income",
                "income_item_id": income_item.id,
                "payment_place_id": payment_place.id,
                "company_id": company.id,
                "description": f"Продажа товаров за {movement_date.strftime('%d.%m.%Y')}",
                "is_business": True
            })
    
    # Расходы на закупку (примерно 2-3 раза в неделю)
    for i in range(days_to_generate):
        if i % 3 == 0:  # Каждый третий день
            movement_date = today - timedelta(days=i)
            base_amount = Decimal("30000.00")
            variation = Decimal(str((i % 5) * 3000))
            movements.append({
                "date": movement_date,
                "amount": base_amount + variation,
                "movement_type": "expense",
                "expense_item_id": expense_item.id,
                "payment_place_id": payment_place.id,
                "company_id": company.id,
                "description": f"Закупка товаров за {movement_date.strftime('%d.%m.%Y')}",
                "is_business": True
            })
    
    # Добавляем другие расходы (еженедельно)
    other_expense_items = db.query(ExpenseItem).filter(ExpenseItem.name != "Закупка товаров").all()
    for expense_item_other in other_expense_items[:4]:
        for week in range(16):  # 16 недель = 4 месяца
            movement_date = today - timedelta(days=week * 7)
            base_amount = Decimal("5000.00")
            variation = Decimal(str(week * 100))
            movements.append({
                "date": movement_date,
                "amount": base_amount + variation,
                "movement_type": "expense",
                "expense_item_id": expense_item_other.id,
                "payment_place_id": payment_place.id,
                "company_id": company.id,
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

def seed_realizations(db: Session, company, marketplace_map):
    """Заполнить реализации"""
    print("\n[INFO] Заполнение реализаций...")
    
    marketplace_keys = ["ozon", "wildberries", "яндекс.маркет"]
    today = date.today()
    realizations = []
    
    # Создаем данные за последние 4 месяца
    # Примерно 2-3 реализации в неделю
    for week in range(16):  # 16 недель = 4 месяца
        for day_in_week in [0, 3, 6]:  # Понедельник, четверг, воскресенье
            realization_date = today - timedelta(days=week * 7 + day_in_week)
            if realization_date > today:
                continue
            marketplace_key = marketplace_keys[(week * 3 + day_in_week) % len(marketplace_keys)]
            marketplace = marketplace_map.get(marketplace_key)
            if not marketplace:
                continue
            
            # Вариация сумм для реалистичности
            base_revenue = Decimal("40000.00")
            variation = Decimal(str((week + day_in_week) * 2000))
            base_quantity = 15
            quantity_variation = week + day_in_week
            
            realizations.append({
                "date": realization_date,
                "marketplace_id": marketplace.id,
                "company_id": company.id,
                "revenue": base_revenue + variation,
                "quantity": base_quantity + quantity_variation,
                "description": f"Реализация на {marketplace.name} за {realization_date.strftime('%d.%m.%Y')}"
            })
    
    count = 0
    for realization_data in realizations:
        existing = db.query(Realization).filter(
            Realization.date == realization_data["date"],
            Realization.marketplace_id == realization_data["marketplace_id"]
        ).first()
        if not existing:
            realization = Realization(**realization_data)
            db.add(realization)
            count += 1
    
    db.commit()
    print(f"[OK] Создано {count} записей реализаций")

def seed_assets_liabilities(db: Session, company):
    """Заполнить активы и обязательства"""
    print("\n[INFO] Заполнение активов и обязательств...")
    
    today = date.today()
    
    # Активы
    assets = [
        {"name": "Денежные средства", "category": "current", "value": Decimal("500000.00"), "date": today, "company_id": company.id, "description": "Остаток на расчетном счете"},
        {"name": "Товарные запасы", "category": "current", "value": Decimal("300000.00"), "date": today, "company_id": company.id, "description": "Стоимость товаров на складе"},
        {"name": "Оборудование", "category": "fixed", "value": Decimal("200000.00"), "date": today, "company_id": company.id, "description": "Офисное оборудование"},
        {"name": "Торговое оборудование", "category": "fixed", "value": Decimal("150000.00"), "date": today, "company_id": company.id, "description": "Торговые стеллажи и витрины"},
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
        {"name": "Кредиторская задолженность", "category": "short_term", "value": Decimal("100000.00"), "date": today, "company_id": company.id, "description": "Задолженность перед поставщиками"},
        {"name": "Краткосрочный кредит", "category": "short_term", "value": Decimal("200000.00"), "date": today, "company_id": company.id, "description": "Банковский кредит"},
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

def seed_shipments(db: Session, company, marketplace_map):
    """Заполнить отгрузки"""
    print("\n[INFO] Заполнение отгрузок...")
    
    products = db.query(Product).limit(5).all()
    if not products:
        print("  [WARN] Товары не найдены, пропускаем отгрузки")
        return
    
    marketplace_keys = ["ozon", "wildberries", "яндекс.маркет"]
    today = date.today()
    shipments = []
    
    # Создаем данные за последние 4 месяца
    # Примерно 1-2 отгрузки в неделю
    for week in range(16):  # 16 недель = 4 месяца
        for day_in_week in [1, 5]:  # Вторник, суббота
            shipment_date = today - timedelta(days=week * 7 + day_in_week)
            if shipment_date > today:
                continue
            
            product = products[(week * 2 + day_in_week) % len(products)]
            marketplace_key = marketplace_keys[(week + day_in_week) % len(marketplace_keys)]
            marketplace = marketplace_map.get(marketplace_key)
            if not marketplace:
                continue
            
            # Вариация количества для реалистичности
            base_quantity = 10
            quantity_variation = week + day_in_week
            
            shipments.append({
                "date": shipment_date,
                "product_id": product.id,
                "marketplace_id": marketplace.id,
                "company_id": company.id,
                "quantity": base_quantity + quantity_variation,
                "cost_price": product.cost_price,
                "description": f"Отгрузка товара {product.name} на {marketplace.name} за {shipment_date.strftime('%d.%m.%Y')}"
            })
    
    try:
        count = 0
        for shipment_data in shipments:
            existing = db.query(Shipment).filter(
                Shipment.date == shipment_data["date"],
                Shipment.product_id == shipment_data["product_id"],
                Shipment.marketplace_id == shipment_data["marketplace_id"]
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
        company, marketplace_map = seed_reference_data(db)
        seed_products(db)
        seed_money_movements(db, company)
        seed_realizations(db, company, marketplace_map)
        seed_assets_liabilities(db, company)
        seed_shipments(db, company, marketplace_map)
        
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
