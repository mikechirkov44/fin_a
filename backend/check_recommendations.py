#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

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
        print("No company")
        sys.exit(1)
    
    print(f"Company: {company.id}")
    
    # Создаем товар с маржой 5%
    test_product = db.query(Product).filter(Product.sku == "TEST-LOW-MARGIN-001").first()
    if not test_product:
        test_product = Product(
            sku="TEST-LOW-MARGIN-001",
            name="Тест низкая маржа",
            cost_price=Decimal("950"),
            selling_price=Decimal("1000"),
            is_active=True
        )
        db.add(test_product)
        db.commit()
    
    margin = float((test_product.selling_price - test_product.cost_price) / test_product.selling_price * 100)
    print(f"Product margin: {margin:.2f}%")
    
    # Удаляем все рекомендации
    db.query(Recommendation).filter(Recommendation.company_id == company.id).delete()
    db.commit()
    
    # Генерируем
    service = RecommendationService(db)
    print(f"MIN_MARGIN: {service.MIN_MARGIN_PERCENT}")
    count = service.generate_recommendations(company.id, user_id=None)
    
    total = db.query(Recommendation).filter(Recommendation.company_id == company.id).count()
    print(f"Generated: {count}, Total: {total}")
    
    if total > 0:
        recs = db.query(Recommendation).filter(Recommendation.company_id == company.id).limit(3).all()
        for r in recs:
            print(f"  - {r.title}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
