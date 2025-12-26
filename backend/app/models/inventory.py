from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Inventory(Base):
    """Текущие остатки товаров на складах"""
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = Column(Numeric(15, 3), nullable=False, default=0)  # Количество (может быть дробным)
    min_stock_level = Column(Numeric(15, 3), default=0)  # Минимальный остаток для алерта
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Уникальный индекс на комбинацию product_id и warehouse_id
    __table_args__ = (
        Index('ix_inventory_product_warehouse', 'product_id', 'warehouse_id', unique=True),
    )

    product = relationship("Product", backref="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")

