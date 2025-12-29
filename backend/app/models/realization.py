from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Realization(Base):
    __tablename__ = "realizations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False)
    revenue = Column(Numeric(15, 2), nullable=False)  # Общая выручка (сумма всех items)
    quantity = Column(Integer, default=0)  # Общее количество (сумма всех items)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])
    marketplace = relationship("Marketplace", foreign_keys=[marketplace_id])
    items = relationship("RealizationItem", back_populates="realization", cascade="all, delete-orphan")


class RealizationItem(Base):
    __tablename__ = "realization_items"

    id = Column(Integer, primary_key=True, index=True)
    realization_id = Column(Integer, ForeignKey("realizations.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(15, 2), nullable=False)  # Цена продажи за единицу
    cost_price = Column(Numeric(15, 2), nullable=False)  # Себестоимость за единицу
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    realization = relationship("Realization", back_populates="items")
    product = relationship("Product", foreign_keys=[product_id])

