from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class InventoryTransaction(Base):
    """История движений товаров (приход/расход)"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String, nullable=False, index=True)  # INCOME, OUTCOME, ADJUSTMENT
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    quantity = Column(Numeric(15, 3), nullable=False)
    cost_price = Column(Numeric(15, 2), nullable=False)  # Себестоимость единицы товара
    date = Column(Date, nullable=False, index=True)
    batch_number = Column(String)  # Номер партии (для FIFO/LIFO)
    document_type = Column(String)  # Тип документа (отгрузка, поступление, корректировка)
    document_id = Column(Integer)  # ID связанного документа (например, shipment_id)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Кто создал транзакцию

    product = relationship("Product", backref="inventory_transactions")
    warehouse = relationship("Warehouse", back_populates="transactions")
    creator = relationship("User", foreign_keys=[created_by])

