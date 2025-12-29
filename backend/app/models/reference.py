from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class IncomeGroup(Base):
    __tablename__ = "income_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    parent_group_id = Column(Integer, ForeignKey("income_groups.id"), nullable=True, index=True)  # Для подгрупп (Поступления/Выбытия)
    subgroup_type = Column(String, nullable=True)  # 'income' или 'expense' для подгрупп
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    income_items = relationship("IncomeItem", back_populates="group", foreign_keys="IncomeItem.group_id")
    parent_group = relationship("IncomeGroup", remote_side=[id], backref="subgroups")

class IncomeItem(Base):
    __tablename__ = "income_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    group_id = Column(Integer, ForeignKey("income_groups.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("IncomeGroup", back_populates="income_items")

class ExpenseGroup(Base):
    __tablename__ = "expense_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    parent_group_id = Column(Integer, ForeignKey("expense_groups.id"), nullable=True, index=True)  # Для подгрупп (Поступления/Выбытия)
    subgroup_type = Column(String, nullable=True)  # 'income' или 'expense' для подгрупп
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    expense_items = relationship("ExpenseItem", back_populates="group", foreign_keys="ExpenseItem.group_id")
    parent_group = relationship("ExpenseGroup", remote_side=[id], backref="subgroups")

class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    group_id = Column(Integer, ForeignKey("expense_groups.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    group = relationship("ExpenseGroup", back_populates="expense_items")

class PaymentPlace(Base):
    __tablename__ = "payment_places"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SalesChannel(Base):
    __tablename__ = "sales_channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

