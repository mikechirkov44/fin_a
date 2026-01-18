"""
Скрипт для создания тестовых товаров с низкой маржинальностью
для проверки системы рекомендаций
"""
from app.database import SessionLocal
from app.models.product import Product
from decimal import Decimal

db = SessionLocal()
try:
    # Товары с низкой/критически низкой маржинальностью
    test_products = [
        {
            "name": "Товар с критически низкой маржой",
            "sku": "TEST-CRITICAL-001",
            "cost_price": Decimal("900.00"),
            "selling_price": Decimal("950.00"),  # Маржинальность = 5.26% (< 10%)
            "description": "Тестовый товар для проверки критических рекомендаций"
        },
        {
            "name": "Товар с низкой маржой",
            "sku": "TEST-LOW-001",
            "cost_price": Decimal("850.00"),
            "selling_price": Decimal("980.00"),  # Маржинальность = 13.27% (10-15%)
            "description": "Тестовый товар для проверки важных рекомендаций"
        },
        {
            "name": "Товар без цены продажи",
            "sku": "TEST-NO-PRICE-001",
            "cost_price": Decimal("500.00"),
            "selling_price": None,
            "description": "Тестовый товар для проверки рекомендаций по незаполненным полям"
        }
    ]
    
    created = 0
    for product_data in test_products:
        existing = db.query(Product).filter(Product.sku == product_data["sku"]).first()
        if not existing:
            product = Product(**product_data, is_active=True)
            db.add(product)
            created += 1
            if product_data["selling_price"]:
                margin = ((product.selling_price - product.cost_price) / product.selling_price * 100)
                print(f"✓ Created: {product.name} (margin: {margin:.2f}%)")
            else:
                print(f"✓ Created: {product.name} (no selling price)")
        else:
            print(f"⊘ Already exists: {product_data['name']}")
    
    db.commit()
    print(f"\n✅ Created {created} test products")
    
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
