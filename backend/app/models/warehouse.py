from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Warehouse(Base):
    """Склады для хранения товаров"""
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(String)
    description = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", backref="warehouses")
    inventory = relationship("Inventory", back_populates="warehouse", cascade="all, delete-orphan")
    transactions = relationship("InventoryTransaction", back_populates="warehouse")

