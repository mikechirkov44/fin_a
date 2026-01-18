"""
Скрипт для заполнения системы тестовыми данными для пользователя testlogin
"""
import sys
import random
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine
from app.models import (
    User, UserCompany, UserRole,
    IncomeGroup, IncomeItem, 
    ExpenseGroup, ExpenseItem, 
    PaymentPlace, Company,
    ExpenseCategory, SalesChannel,
    MoneyMovement, Asset, Liability, Product,
    Realization, RealizationItem, Shipment,
    Warehouse, Customer, CustomerSegment,
    Supplier, Inventory, Budget, MarketplaceIntegration
)
from app.models.budget import BudgetType, BudgetPeriod
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
    
    # Группы статей доходов (родительские группы)
    income_groups = [
        {"name": "Основная деятельность", "description": "Доходы от основной деятельности"},
        {"name": "Инвестиционная деятельность", "description": "Доходы от инвестиций"},
    ]
    
    income_group_map = {}
    for group_data in income_groups:
        group = db.query(IncomeGroup).filter(IncomeGroup.name == group_data["name"]).first()
        if not group:
            group = IncomeGroup(**group_data)
            db.add(group)
            print(f"  [OK] Создана группа доходов: {group_data['name']}")
        else:
            print(f"  [OK] Группа доходов уже существует: {group_data['name']}")
        db.commit()
        db.refresh(group)
        income_group_map[group_data["name"]] = group
    
    # Создаем подгруппы "Поступления" для родительских групп
    for parent_name, parent_group in list(income_group_map.items()):
        subgroup_name = "Поступления"
        subgroup = db.query(IncomeGroup).filter(
            IncomeGroup.name == subgroup_name,
            IncomeGroup.parent_group_id == parent_group.id
        ).first()
        if not subgroup:
            subgroup = IncomeGroup(
                name=subgroup_name,
                description=f"Поступления в рамках {parent_name}",
                parent_group_id=parent_group.id,
                subgroup_type="income"
            )
            db.add(subgroup)
            print(f"  [OK] Создана подгруппа доходов: {subgroup_name} в {parent_name}")
            db.commit()
            db.refresh(subgroup)
        income_group_map[f"{parent_name}_{subgroup_name}"] = subgroup
    
    # Группы статей расходов (родительские группы)
    expense_groups = [
        {"name": "Основная деятельность", "description": "Расходы основной деятельности"},
        {"name": "Инвестиционная деятельность", "description": "Инвестиционные расходы"},
        {"name": "Кредиты, займы", "description": "Расходы по кредитам и займам"},
        {"name": "Дивиденды", "description": "Выплата дивидендов"},
    ]
    
    expense_group_map = {}
    for group_data in expense_groups:
        group = db.query(ExpenseGroup).filter(ExpenseGroup.name == group_data["name"]).first()
        if not group:
            group = ExpenseGroup(**group_data)
            db.add(group)
            print(f"  [OK] Создана группа расходов: {group_data['name']}")
        else:
            print(f"  [OK] Группа расходов уже существует: {group_data['name']}")
        db.commit()
        db.refresh(group)
        expense_group_map[group_data["name"]] = group
    
    # Создаем подгруппы "Выбытия" для родительских групп (кроме тех, где статьи напрямую)
    for parent_name, parent_group in list(expense_group_map.items()):
        if parent_name in ["Кредиты, займы", "Дивиденды"]:
            continue  # Эти группы не имеют подгрупп
        
        subgroup_name = "Выбытия"
        subgroup = db.query(ExpenseGroup).filter(
            ExpenseGroup.name == subgroup_name,
            ExpenseGroup.parent_group_id == parent_group.id
        ).first()
        if not subgroup:
            subgroup = ExpenseGroup(
                name=subgroup_name,
                description=f"Выбытия в рамках {parent_name}",
                parent_group_id=parent_group.id,
                subgroup_type="expense"
            )
            db.add(subgroup)
            print(f"  [OK] Создана подгруппа расходов: {subgroup_name} в {parent_name}")
            db.commit()
            db.refresh(subgroup)
        expense_group_map[f"{parent_name}_{subgroup_name}"] = subgroup
    
    # Категории расходов
    expense_categories = [
        {"name": "Производственные", "description": "Производственные расходы"},
        {"name": "Административные", "description": "Административные расходы"},
        {"name": "Коммерческие", "description": "Коммерческие расходы"},
    ]
    
    for category_data in expense_categories:
        category = db.query(ExpenseCategory).filter(ExpenseCategory.name == category_data["name"]).first()
        if not category:
            category = ExpenseCategory(**category_data)
            db.add(category)
            print(f"  [OK] Создана категория расходов: {category_data['name']}")
        else:
            print(f"  [OK] Категория расходов уже существует: {category_data['name']}")
    
    # Каналы продаж
    sales_channels = [
        {"name": "WB", "description": "Wildberries"},
        {"name": "Ozon", "description": "Ozon маркетплейс"},
        {"name": "Яндекс", "description": "Яндекс.Маркет"},
        {"name": "Частные заказы", "description": "Частные заказы (свое производство)"},
        {"name": "Аренда", "description": "Доходы от аренды"},
    ]
    
    sales_channel_map = {}
    for channel_data in sales_channels:
        channel = db.query(SalesChannel).filter(SalesChannel.name == channel_data["name"]).first()
        if not channel:
            channel = SalesChannel(**channel_data)
            db.add(channel)
            print(f"  [OK] Создан канал продаж: {channel_data['name']}")
        else:
            print(f"  [OK] Канал продаж уже существует: {channel_data['name']}")
        db.commit()
        db.refresh(channel)
        sales_channel_map[channel_data["name"]] = channel
    
    # Статьи доходов (привязываем к подгруппе "Поступления" в "Основная деятельность")
    income_items = [
        {"name": "WB", "description": "Доходы от продажи на Wildberries", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
        {"name": "Ozon", "description": "Доходы от продажи на Ozon", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
        {"name": "Яндекс", "description": "Доходы от продажи на Яндекс.Маркет", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
        {"name": "Частные заказы(свое производство)", "description": "Доходы от частных заказов", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
        {"name": "Возврат денег за покупку", "description": "Возврат денежных средств", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
        {"name": "Аренда", "description": "Доходы от аренды", "parent_group": "Основная деятельность", "subgroup": "Поступления"},
    ]
    
    for item_data in income_items:
        item = db.query(IncomeItem).filter(IncomeItem.name == item_data["name"]).first()
        if not item:
            parent_group = item_data.get("parent_group")
            subgroup = item_data.get("subgroup")
            group_key = f"{parent_group}_{subgroup}" if subgroup else parent_group
            group_id = income_group_map.get(group_key).id if group_key in income_group_map else None
            item_dict = {k: v for k, v in item_data.items() if k not in ["parent_group", "subgroup"]}
            item = IncomeItem(**item_dict, group_id=group_id)
            db.add(item)
            print(f"  [OK] Создана статья дохода: {item_data['name']}")
    
    # Статьи расходов
    expense_items = [
        {"name": "Закупка товаров", "description": "Расходы на закупку товаров", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Зарплата", "description": "Расходы на оплату труда", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Аренда", "description": "Расходы на аренду помещений", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Реклама", "description": "Расходы на рекламу и маркетинг", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Коммунальные услуги", "description": "Электричество, вода, интернет", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Транспорт", "description": "Расходы на транспорт", "parent_group": "Основная деятельность", "subgroup": "Выбытия"},
        {"name": "Капитальный ремонт", "description": "Расходы на капитальный ремонт", "parent_group": "Инвестиционная деятельность", "subgroup": "Выбытия"},
        {"name": "Основные средства", "description": "Приобретение основных средств", "parent_group": "Инвестиционная деятельность", "subgroup": "Выбытия"},
        {"name": "Выплата тела по кредиту/займу", "description": "Погашение кредита", "parent_group": "Кредиты, займы", "subgroup": None},
        {"name": "Вывод дивидендов (в т.ч. личные расходы)", "description": "Выплата дивидендов", "parent_group": "Дивиденды", "subgroup": None},
        {"name": "Внешние займы", "description": "Внешние займы", "parent_group": "Кредиты, займы", "subgroup": None},
    ]
    
    for item_data in expense_items:
        item = db.query(ExpenseItem).filter(ExpenseItem.name == item_data["name"]).first()
        if not item:
            parent_group = item_data.get("parent_group")
            subgroup = item_data.get("subgroup")
            group_key = f"{parent_group}_{subgroup}" if subgroup else parent_group
            group_id = expense_group_map.get(group_key).id if group_key in expense_group_map else None
            item_dict = {k: v for k, v in item_data.items() if k not in ["parent_group", "subgroup"]}
            item = ExpenseItem(**item_dict, group_id=group_id)
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
    
    # Используем существующие каналы продаж для маппинга
    marketplace_map = {}
    # Маппинг имен маркетплейсов на каналы продаж
    marketplace_mapping = {
        "ozon": "Ozon",
        "wildberries": "WB", 
        "яндекс.маркет": "Яндекс"
    }
    
    for marketplace_key, sales_channel_name in marketplace_mapping.items():
        sales_channel = sales_channel_map.get(sales_channel_name)
        if sales_channel:
            marketplace_map[marketplace_key] = sales_channel
    
    db.commit()
    db.refresh(company)
    print("[OK] Справочники заполнены")
    return company, marketplace_map, sales_channel_map

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
    # Используем одну из существующих статей доходов (например, "WB")
    income_items = db.query(IncomeItem).filter(IncomeItem.name.in_(["WB", "Ozon", "Яндекс"])).all()
    expense_item = db.query(ExpenseItem).filter(ExpenseItem.name == "Закупка товаров").first()
    payment_place = db.query(PaymentPlace).filter(PaymentPlace.name == "Расчетный счет").first()
    
    if not income_items or not expense_item or not payment_place or not company:
        print("  [WARN] Справочники не найдены, пропускаем движение денег")
        return
    
    # Генерируем данные за последний год (365 дней)
    today = date.today()
    movements = []
    days_to_generate = 365
    
    # Доходы (примерно 3-4 раза в неделю) - используем разные статьи доходов
    for i in range(days_to_generate):
        if i % 2 == 0:  # Каждый второй день
            movement_date = today - timedelta(days=i)
            # Вариация сумм для реалистичности
            base_amount = Decimal("50000.00")
            variation = Decimal(str((i % 7) * 5000))  # Разная сумма в разные дни недели
            # Используем разные статьи доходов по кругу
            income_item = income_items[i % len(income_items)]
            movements.append({
                "date": movement_date,
                "amount": base_amount + variation,
                "movement_type": "income",
                "income_item_id": income_item.id,
                "payment_place_id": payment_place.id,
                "company_id": company.id,
                "description": f"{income_item.name} - продажа товаров за {movement_date.strftime('%d.%m.%Y')}",
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
        for week in range(52):  # 52 недели = 1 год
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
    
    # Создаем данные за последний год
    # Примерно 2-3 реализации в неделю
    for week in range(52):  # 52 недели = 1 год
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
                "sales_channel_id": marketplace.id,
                "company_id": company.id,
                "revenue": base_revenue + variation,
                "quantity": base_quantity + quantity_variation,
                "description": f"Реализация на {marketplace.name} за {realization_date.strftime('%d.%m.%Y')}"
            })
    
    count = 0
    for realization_data in realizations:
        existing = db.query(Realization).filter(
            Realization.date == realization_data["date"],
            Realization.sales_channel_id == realization_data["sales_channel_id"]
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
    
    # Создаем данные за последний год
    # Примерно 1-2 отгрузки в неделю
    for week in range(52):  # 52 недели = 1 год
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
                "sales_channel_id": marketplace.id,
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
                Shipment.sales_channel_id == shipment_data["sales_channel_id"]
            ).first()
            if not existing:
                shipment = Shipment(**shipment_data)
                db.add(shipment)
                count += 1
        
        db.commit()
        print(f"[OK] Создано {count} записей отгрузок")
    except Exception as e:
        print(f"  [WARN] Ошибка при создании отгрузок: {e}")

def seed_user_company(db: Session, user, company):
    """Создать связь пользователя с организацией"""
    print("\n[INFO] Создание связи пользователя с организацией...")
    
    user_company = db.query(UserCompany).filter(
        UserCompany.user_id == user.id,
        UserCompany.company_id == company.id
    ).first()
    
    if not user_company:
        user_company = UserCompany(
            user_id=user.id,
            company_id=company.id,
            role=UserRole.ADMIN.value  # Администратор организации
        )
        db.add(user_company)
        db.commit()
        print(f"  [OK] Создана связь пользователя '{user.username}' с организацией '{company.name}' (роль: {UserRole.ADMIN.value})")
    else:
        print(f"  [OK] Связь пользователя с организацией уже существует")
    
    return user_company

def seed_warehouses(db: Session, company):
    """Заполнить склады"""
    print("\n[INFO] Заполнение складов...")
    
    warehouses = [
        {"name": "Основной склад", "address": "г. Москва, ул. Складская, д. 1", "description": "Основной склад компании", "company_id": company.id},
        {"name": "Склад №2", "address": "г. Москва, ул. Товарная, д. 5", "description": "Дополнительный склад", "company_id": company.id},
    ]
    
    count = 0
    for warehouse_data in warehouses:
        warehouse = db.query(Warehouse).filter(
            Warehouse.name == warehouse_data["name"],
            Warehouse.company_id == company.id
        ).first()
        if not warehouse:
            warehouse = Warehouse(**warehouse_data)
            db.add(warehouse)
            count += 1
            print(f"  [OK] Создан склад: {warehouse_data['name']}")
        else:
            print(f"  [OK] Склад уже существует: {warehouse_data['name']}")
    
    db.commit()
    print(f"[OK] Создано {count} новых складов")

def seed_customers(db: Session, company):
    """Заполнить клиентов"""
    print("\n[INFO] Заполнение клиентов...")
    
    # Создаем сегменты клиентов
    segments = [
        {"name": "VIP", "description": "VIP клиенты", "company_id": company.id, "color": "#FFD700"},
        {"name": "Постоянные", "description": "Постоянные клиенты", "company_id": company.id, "color": "#4a90e2"},
        {"name": "Новые", "description": "Новые клиенты", "company_id": company.id, "color": "#50C878"},
    ]
    
    segment_map = {}
    for segment_data in segments:
        segment = db.query(CustomerSegment).filter(
            CustomerSegment.name == segment_data["name"],
            CustomerSegment.company_id == company.id
        ).first()
        if not segment:
            segment = CustomerSegment(**segment_data)
            db.add(segment)
            print(f"  [OK] Создан сегмент клиентов: {segment_data['name']}")
        else:
            print(f"  [OK] Сегмент клиентов уже существует: {segment_data['name']}")
        db.commit()
        db.refresh(segment)
        segment_map[segment_data["name"]] = segment
    
    # Создаем клиентов
    customers = [
        {"name": "Иван Иванов", "type": "individual", "phone": "+7 (999) 123-45-67", "email": "ivan@example.com", "company_id": company.id, "segment": "VIP"},
        {"name": "ООО 'Покупатель'", "type": "company", "phone": "+7 (999) 234-56-78", "email": "buyer@example.com", "inn": "1234567890", "kpp": "123456789", "legal_name": "ООО 'Покупатель'", "company_id": company.id, "segment": "Постоянные"},
        {"name": "Петр Петров", "type": "individual", "phone": "+7 (999) 345-67-89", "email": "petr@example.com", "company_id": company.id, "segment": "Новые"},
        {"name": "Мария Сидорова", "type": "individual", "phone": "+7 (999) 456-78-90", "email": "maria@example.com", "company_id": company.id, "segment": "Постоянные"},
    ]
    
    count = 0
    for customer_data in customers:
        segment_name = customer_data.pop("segment", None)
        segment_id = segment_map.get(segment_name).id if segment_name and segment_name in segment_map else None
        
        customer = db.query(Customer).filter(
            Customer.name == customer_data["name"],
            Customer.company_id == company.id
        ).first()
        if not customer:
            customer = Customer(**customer_data, segment_id=segment_id)
            db.add(customer)
            count += 1
            print(f"  [OK] Создан клиент: {customer_data['name']}")
        else:
            print(f"  [OK] Клиент уже существует: {customer_data['name']}")
    
    db.commit()
    print(f"[OK] Создано {count} новых клиентов")

def seed_suppliers(db: Session, company):
    """Заполнить поставщиков"""
    print("\n[INFO] Заполнение поставщиков...")
    
    suppliers = [
        {"name": "ООО 'Поставщик 1'", "contact_person": "Алексей Алексеев", "phone": "+7 (999) 111-22-33", "email": "supplier1@example.com", "inn": "1111111111", "kpp": "111111111", "ogrn": "1111111111111", "legal_address": "г. Москва, ул. Поставщиков, д. 1", "rating": Decimal("4.5"), "company_id": company.id},
        {"name": "ООО 'Поставщик 2'", "contact_person": "Борис Борисов", "phone": "+7 (999) 222-33-44", "email": "supplier2@example.com", "inn": "2222222222", "kpp": "222222222", "ogrn": "2222222222222", "legal_address": "г. Москва, ул. Товарная, д. 2", "rating": Decimal("4.0"), "company_id": company.id},
        {"name": "ИП 'Поставщик 3'", "contact_person": "Владимир Владимиров", "phone": "+7 (999) 333-44-55", "email": "supplier3@example.com", "inn": "333333333333", "rating": Decimal("3.5"), "company_id": company.id},
    ]
    
    count = 0
    for supplier_data in suppliers:
        supplier = db.query(Supplier).filter(
            Supplier.name == supplier_data["name"],
            Supplier.company_id == company.id
        ).first()
        if not supplier:
            supplier = Supplier(**supplier_data)
            db.add(supplier)
            count += 1
            print(f"  [OK] Создан поставщик: {supplier_data['name']}")
        else:
            print(f"  [OK] Поставщик уже существует: {supplier_data['name']}")
    
    db.commit()
    print(f"[OK] Создано {count} новых поставщиков")

def seed_inventory(db: Session, company):
    """Заполнить остатки на складах"""
    print("\n[INFO] Заполнение остатков на складах...")
    
    warehouses = db.query(Warehouse).filter(Warehouse.company_id == company.id).all()
    products = db.query(Product).filter(Product.is_active == True).all()
    
    if not warehouses or not products:
        print("  [WARN] Склады или товары не найдены, пропускаем остатки")
        return
    
    count = 0
    for product in products:
        for warehouse in warehouses:
            existing = db.query(Inventory).filter(
                Inventory.product_id == product.id,
                Inventory.warehouse_id == warehouse.id
            ).first()
            
            if not existing:
                # Случайный остаток от 10 до 100 единиц
                quantity = Decimal(str(random.randint(10, 100)))
                min_stock = Decimal(str(random.randint(5, 20)))
                
                inventory = Inventory(
                    product_id=product.id,
                    warehouse_id=warehouse.id,
                    quantity=quantity,
                    min_stock_level=min_stock
                )
                db.add(inventory)
                count += 1
    
    db.commit()
    print(f"[OK] Создано {count} записей остатков на складах")

def seed_realization_items(db: Session, company):
    """Заполнить товары в реализациях"""
    print("\n[INFO] Заполнение товаров в реализациях...")
    
    realizations = db.query(Realization).filter(Realization.company_id == company.id).all()
    products = db.query(Product).filter(Product.is_active == True).all()
    
    if not realizations or not products:
        print("  [WARN] Реализации или товары не найдены, пропускаем товары в реализациях")
        return
    
    count = 0
    for realization in realizations:
        # Проверяем, есть ли уже товары в этой реализации
        existing_items = db.query(RealizationItem).filter(
            RealizationItem.realization_id == realization.id
        ).first()
        
        if not existing_items:
            # Добавляем 1-3 товара в каждую реализацию
            num_products = random.randint(1, min(3, len(products)))
            selected_products = random.sample(products, num_products)
            
            total_revenue = Decimal("0")
            total_quantity = 0
            
            for product in selected_products:
                quantity = random.randint(1, 5)
                price = product.selling_price or product.cost_price * Decimal("1.5")
                cost_price = product.cost_price
                
                item = RealizationItem(
                    realization_id=realization.id,
                    product_id=product.id,
                    quantity=quantity,
                    price=price,
                    cost_price=cost_price
                )
                db.add(item)
                count += 1
                
                total_revenue += price * quantity
                total_quantity += quantity
            
            # Обновляем общие суммы в реализации
            realization.revenue = total_revenue
            realization.quantity = total_quantity
    
    db.commit()
    print(f"[OK] Создано {count} записей товаров в реализациях")

def seed_budgets(db: Session, company):
    """Заполнить бюджеты"""
    print("\n[INFO] Заполнение бюджетов...")
    
    income_items = db.query(IncomeItem).limit(3).all()
    expense_items = db.query(ExpenseItem).limit(5).all()
    
    today = date.today()
    current_month = today.strftime("%Y-%m")
    current_quarter = f"{today.year}-Q{((today.month - 1) // 3) + 1}"
    current_year = str(today.year)
    
    budgets = []
    
    # Бюджеты доходов на текущий месяц
    for income_item in income_items[:2]:
        budgets.append({
            "company_id": company.id,
            "period_type": BudgetPeriod.MONTH,
            "period_value": current_month,
            "budget_type": BudgetType.INCOME,
            "income_item_id": income_item.id,
            "planned_amount": Decimal("500000.00"),
            "description": f"План по доходу '{income_item.name}' на {current_month}"
        })
    
    # Бюджеты расходов на текущий месяц
    for expense_item in expense_items[:3]:
        budgets.append({
            "company_id": company.id,
            "period_type": BudgetPeriod.MONTH,
            "period_value": current_month,
            "budget_type": BudgetType.EXPENSE,
            "expense_item_id": expense_item.id,
            "planned_amount": Decimal("200000.00") if expense_item.name == "Закупка товаров" else Decimal("50000.00"),
            "description": f"План по расходу '{expense_item.name}' на {current_month}"
        })
    
    # Бюджет доходов на квартал
    if income_items:
        budgets.append({
            "company_id": company.id,
            "period_type": BudgetPeriod.QUARTER,
            "period_value": current_quarter,
            "budget_type": BudgetType.INCOME,
            "income_item_id": None,  # Общий доход
            "planned_amount": Decimal("4500000.00"),
            "description": f"Общий план по доходам на {current_quarter}"
        })
    
    # Бюджет расходов на квартал
    if expense_items:
        budgets.append({
            "company_id": company.id,
            "period_type": BudgetPeriod.QUARTER,
            "period_value": current_quarter,
            "budget_type": BudgetType.EXPENSE,
            "expense_item_id": None,  # Общий расход
            "planned_amount": Decimal("3000000.00"),
            "description": f"Общий план по расходам на {current_quarter}"
        })
    
    # Бюджет на год
    budgets.append({
        "company_id": company.id,
        "period_type": BudgetPeriod.YEAR,
        "period_value": current_year,
        "budget_type": BudgetType.INCOME,
        "income_item_id": None,
        "planned_amount": Decimal("18000000.00"),
        "description": f"Общий план по доходам на {current_year} год"
    })
    
    budgets.append({
        "company_id": company.id,
        "period_type": BudgetPeriod.YEAR,
        "period_value": current_year,
        "budget_type": BudgetType.EXPENSE,
        "expense_item_id": None,
        "planned_amount": Decimal("12000000.00"),
        "description": f"Общий план по расходам на {current_year} год"
    })
    
    count = 0
    for budget_data in budgets:
        existing = db.query(Budget).filter(
            Budget.company_id == company.id,
            Budget.period_type == budget_data["period_type"],
            Budget.period_value == budget_data["period_value"],
            Budget.budget_type == budget_data["budget_type"],
            Budget.income_item_id == budget_data.get("income_item_id"),
            Budget.expense_item_id == budget_data.get("expense_item_id")
        ).first()
        
        if not existing:
            budget = Budget(**budget_data)
            db.add(budget)
            count += 1
    
    db.commit()
    print(f"[OK] Создано {count} бюджетов")

def seed_marketplace_integrations(db: Session, company):
    """Заполнить интеграции с маркетплейсами"""
    print("\n[INFO] Заполнение интеграций с маркетплейсами...")
    
    integrations = [
        {
            "marketplace_name": "OZON",
            "company_id": company.id,
            "ozon_client_id": "123456",
            "ozon_api_key": "test_ozon_api_key_123456",
            "is_active": True,
            "auto_sync": False,
            "sync_interval_hours": 24
        },
        {
            "marketplace_name": "Wildberries",
            "company_id": company.id,
            "wb_api_key": "test_wb_api_key_789012",
            "wb_stat_api_key": "test_wb_stat_api_key_345678",
            "is_active": True,
            "auto_sync": False,
            "sync_interval_hours": 24
        },
    ]
    
    count = 0
    for integration_data in integrations:
        existing = db.query(MarketplaceIntegration).filter(
            MarketplaceIntegration.marketplace_name == integration_data["marketplace_name"],
            MarketplaceIntegration.company_id == company.id
        ).first()
        
        if not existing:
            integration = MarketplaceIntegration(**integration_data)
            db.add(integration)
            count += 1
            print(f"  [OK] Создана интеграция: {integration_data['marketplace_name']}")
        else:
            print(f"  [OK] Интеграция уже существует: {integration_data['marketplace_name']}")
    
    db.commit()
    print(f"[OK] Создано {count} новых интеграций")

def main():
    """Основная функция"""
    print("[START] Начало заполнения тестовыми данными...")
    print("=" * 50)
    
    db = SessionLocal()
    try:
        # Создаем пользователя
        user = get_or_create_user(db)
        
        # Заполняем данные
        company, marketplace_map, sales_channel_map = seed_reference_data(db)
        
        # Создаем связь пользователя с организацией
        seed_user_company(db, user, company)
        
        # Заполняем дополнительные справочники
        seed_warehouses(db, company)
        seed_customers(db, company)
        seed_suppliers(db, company)
        
        # Заполняем основные данные
        seed_products(db)
        seed_money_movements(db, company)
        seed_realizations(db, company, marketplace_map)
        seed_realization_items(db, company)  # Товары в реализациях
        seed_assets_liabilities(db, company)
        seed_shipments(db, company, marketplace_map)
        
        # Заполняем дополнительные данные
        seed_inventory(db, company)  # Остатки на складах
        seed_budgets(db, company)  # Бюджеты
        seed_marketplace_integrations(db, company)  # Интеграции с маркетплейсами
        
        print("\n" + "=" * 50)
        print("[SUCCESS] Заполнение тестовыми данными завершено!")
        print(f"Логин: testlogin")
        print(f"Пароль: testpassword")
        print(f"Организация: {company.name}")
        print(f"Роль в организации: {UserRole.ADMIN.value}")
        
    except Exception as e:
        print(f"\n[ERROR] Ошибка: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
