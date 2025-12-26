from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ProductCost(Base):
    """Партии товаров для расчета себестоимости (FIFO/LIFO/средняя)"""
    __tablename__ = "product_costs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = Column(Numeric(15, 3), nullable=False)  # Остаток по партии
    cost_price = Column(Numeric(15, 2), nullable=False)  # Себестоимость партии
    date = Column(Date, nullable=False, index=True)  # Дата поступления партии
    batch_number = Column(String, index=True)  # Номер партии
    transaction_id = Column(Integer, ForeignKey("inventory_transactions.id"), nullable=True)  # Связь с транзакцией
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    product = relationship("Product", backref="product_costs")
    warehouse = relationship("Warehouse", backref="product_costs")
    transaction = relationship("InventoryTransaction", foreign_keys=[transaction_id])

