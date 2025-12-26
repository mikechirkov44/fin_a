from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class BudgetType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"

class BudgetPeriod(str, enum.Enum):
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    period_type = Column(SQLEnum(BudgetPeriod), nullable=False)  # month, quarter, year
    period_value = Column(String(20), nullable=False)  # "2024-01" для месяца, "2024-Q1" для квартала, "2024" для года
    budget_type = Column(SQLEnum(BudgetType), nullable=False)  # income или expense
    income_item_id = Column(Integer, ForeignKey("income_items.id"), nullable=True)
    expense_item_id = Column(Integer, ForeignKey("expense_items.id"), nullable=True)
    planned_amount = Column(Numeric(15, 2), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])
    income_item = relationship("IncomeItem", foreign_keys=[income_item_id])
    expense_item = relationship("ExpenseItem", foreign_keys=[expense_item_id])

