from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class MoneyMovement(Base):
    __tablename__ = "money_movements"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    movement_type = Column(String, nullable=False)  # 'income' or 'expense'
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    income_item_id = Column(Integer, ForeignKey("income_items.id"), nullable=True)
    expense_item_id = Column(Integer, ForeignKey("expense_items.id"), nullable=True)
    payment_place_id = Column(Integer, ForeignKey("payment_places.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True, index=True)  # Только для income
    description = Column(String)
    is_business = Column(Boolean, default=True)  # True - бизнес, False - личное
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])
    income_item = relationship("IncomeItem", foreign_keys=[income_item_id])
    expense_item = relationship("ExpenseItem", foreign_keys=[expense_item_id])
    payment_place = relationship("PaymentPlace", foreign_keys=[payment_place_id])
    supplier = relationship("Supplier", foreign_keys=[supplier_id])

