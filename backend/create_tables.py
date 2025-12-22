"""
Скрипт для создания таблиц в базе данных
Использование: python create_tables.py
"""
from app.database import engine, Base
from app.models import (
    User, IncomeItem, ExpenseItem, PaymentPlace, Company, Marketplace,
    MoneyMovement, Asset, Liability, Realization, Shipment, Product
)

def create_tables():
    print("Создание таблиц в базе данных...")
    Base.metadata.create_all(bind=engine)
    print("Таблицы успешно созданы!")

if __name__ == "__main__":
    create_tables()
