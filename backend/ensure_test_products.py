#!/usr/bin/env python3
"""Создание тестовых товаров и генерация рекомендаций"""
import sys
from decimal import Decimal
from app.database import SessionLocal
from app.models.product import Product
from app.models.reference import Company
from app.services.recommendation_service import RecommendationService
from app.models.recommendation import Recommendation

db = SessionLocal()
try:
    company = db.query(Company).first()
    if not company:
        print("❌ No company found")
        sys.exit(1)
    
    print(f"Company: {company.id} - {company.name}\n")
    
    # Создаем/обновляем тестовый товар с низкой маржой (5%)
    test_sku = "TEST-LOW-MARGIN-001"
    test_product = db.query(Product).filter(Product.sku == test_sku).first()
    
    if not test_product:
        test_product = Product(
            sku=test_sku,
            name="Тестовый товар с критически низкой маржой",
            cost_price=Decimal("950.00"),
            selling_price=Decimal("1000.00"),  # Маржа = 5%
            is_active=True
        )
        db.add(test_product)
        db.commit()
        print(f"✓ Created test product: {test_product.name}")
    else:
        # Обновляем значения
        test_product.cost_price = Decimal("950.00")
        test_product.selling_price = Decimal("1000.00")
        test_product.is_active = True
        db.commit()
        print(f"✓ Updated test product: {test_product.name}")
    
    margin = float((test_product.selling_price - test_product.cost_price) / test_product.selling_price * 100)
    print(f"  Margin: {margin:.2f}% (MIN_MARGIN_PERCENT = 10%)\n")
    
    # Удаляем все рекомендации
    deleted = db.query(Recommendation).filter(Recommendation.company_id == company.id).delete()
    db.commit()
    print(f"Deleted {deleted} old recommendations\n")
    
    # Генерируем рекомендации (user_id=None для общих рекомендаций)
    service = RecommendationService(db)
    count = service.generate_recommendations(company.id, user_id=None)
    
    total = db.query(Recommendation).filter(Recommendation.company_id == company.id).count()
    print(f"✅ Generated: {count} recommendations")
    print(f"✅ Total in DB: {total}\n")
    
    if total > 0:
        recs = db.query(Recommendation).filter(
            Recommendation.company_id == company.id
        ).limit(5).all()
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
