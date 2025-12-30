from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Контактная информация
    contact_person = Column(String)
    phone = Column(String)
    email = Column(String)
    
    # Реквизиты
    inn = Column(String)  # ИНН
    kpp = Column(String)  # КПП
    ogrn = Column(String)  # ОГРН
    legal_address = Column(Text)
    actual_address = Column(Text)
    
    # Банковские реквизиты
    bank_name = Column(String)
    bank_account = Column(String)  # Расчетный счет
    correspondent_account = Column(String)  # Корреспондентский счет
    bik = Column(String)  # БИК
    
    # Дополнительная информация
    description = Column(Text)
    rating = Column(Numeric(3, 2), default=0)  # Рейтинг от 0 до 5
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    company = relationship("Company", backref="suppliers")
    orders = relationship("SupplierOrder", back_populates="supplier", cascade="all, delete-orphan")
    contracts = relationship("SupplierContract", back_populates="supplier", cascade="all, delete-orphan")

class SupplierOrder(Base):
    __tablename__ = "supplier_orders"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    order_number = Column(String, nullable=False, index=True)
    order_date = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    actual_delivery_date = Column(Date)
    
    status = Column(String, default="pending")  # pending, confirmed, shipped, delivered, cancelled
    
    total_amount = Column(Numeric(12, 2), default=0)
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    supplier = relationship("Supplier", back_populates="orders")
    company = relationship("Company")
    items = relationship("SupplierOrderItem", back_populates="order", cascade="all, delete-orphan")

class SupplierOrderItem(Base):
    __tablename__ = "supplier_order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("supplier_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    product_name = Column(String, nullable=False)  # Название товара (если нет в справочнике)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    
    description = Column(Text)
    
    # Связи
    order = relationship("SupplierOrder", back_populates="items")
    product = relationship("Product")

class SupplierContract(Base):
    __tablename__ = "supplier_contracts"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    contract_number = Column(String, nullable=False, index=True)
    contract_date = Column(Date, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    
    contract_type = Column(String, default="supply")  # supply, service, etc.
    total_amount = Column(Numeric(12, 2))
    
    description = Column(Text)
    file_path = Column(String)  # Путь к файлу договора
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    supplier = relationship("Supplier", back_populates="contracts")
    company = relationship("Company")

