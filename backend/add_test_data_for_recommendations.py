#!/usr/bin/env python3
"""Добавление тестовых данных для генерации рекомендаций"""
import sys
from decimal import Decimal
from app.database import SessionLocal
from app.models.product import Product
from app.models.reference import Company
from app.models.recommendation import Recommendation
from app.services.recommendation_service import RecommendationService

db = SessionLocal()
try:
    company = db.query(Company).first()
    if not company:
        print("❌ No company found")
        sys.exit(1)
    
    print(f"✓ Company: {company.id} - {company.name}\n")
    
    # Создаем тестовые товары
    test_products = [
        {
            "sku": "TEST-CRITICAL-001",
            "name": "Товар с критически низкой маржой",
            "cost_price": Decimal("950.00"),
            "selling_price": Decimal("1000.00"),  # Маржа = 5%
        },
        {
            "sku": "TEST-LOW-001",
            "name": "Товар с низкой маржой",
            "cost_price": Decimal("850.00"),
            "selling_price": Decimal("980.00"),  # Маржа = 13.27%
        },
        {
            "sku": "TEST-NO-PRICE-001",
            "name": "Товар без цены продажи",
            "cost_price": Decimal("500.00"),
            "selling_price": None,
        }
    ]
    
    for prod_data in test_products:
        existing = db.query(Product).filter(Product.sku == prod_data["sku"]).first()
        if not existing:
            product = Product(**prod_data, is_active=True, description="Тестовый товар")
            db.add(product)
            margin_text = f"margin: {float((prod_data['selling_price'] - prod_data['cost_price']) / prod_data['selling_price'] * 100):.2f}%" if prod_data["selling_price"] else "no price"
            print(f"✓ Created: {prod_data['name']} ({margin_text})")
        else:
            existing.cost_price = prod_data["cost_price"]
            existing.selling_price = prod_data["selling_price"]
            existing.is_active = True
            margin_text = f"margin: {float((prod_data['selling_price'] - prod_data['cost_price']) / prod_data['selling_price'] * 100):.2f}%" if prod_data["selling_price"] else "no price"
            print(f"✓ Updated: {prod_data['name']} ({margin_text})")
    
    db.commit()
    print("\n✅ Test products ready\n")
    
    # Удаляем старые рекомендации
    deleted = db.query(Recommendation).filter(Recommendation.company_id == company.id).delete()
    db.commit()
    print(f"✓ Deleted {deleted} old recommendations\n")
    
    # Генерируем рекомендации
    service = RecommendationService(db)
    count = service.generate_recommendations(company.id, user_id=None)
    
    total = db.query(Recommendation).filter(Recommendation.company_id == company.id).count()
    print(f"✅ Generated: {count} recommendations")
    print(f"✅ Total in DB: {total}\n")
    
    if total > 0:
        recs = db.query(Recommendation).filter(
            Recommendation.company_id == company.id,
            Recommendation.is_dismissed == False
        ).order_by(Recommendation.priority.desc()).limit(5).all()
        print("Recommendations:")
        for r in recs:
            print(f"  - [{r.priority.value}] {r.title}")
    else:
        print("⚠️ No recommendations!")
        
except Exception as e:
    import traceback
    print(f"❌ ERROR: {e}")
    traceback.print_exc()
    db.rollback()
finally:
    db.close()
