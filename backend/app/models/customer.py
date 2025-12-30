from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Основная информация
    name = Column(String, nullable=False, index=True)
    type = Column(String, default="individual")  # individual, company
    
    # Контактная информация
    phone = Column(String, index=True)
    email = Column(String, index=True)
    address = Column(Text)
    
    # Для юридических лиц
    inn = Column(String)
    kpp = Column(String)
    legal_name = Column(String)
    
    # Сегментация
    segment_id = Column(Integer, ForeignKey("customer_segments.id"), nullable=True)
    
    # Метрики (рассчитываются автоматически)
    total_purchases = Column(Numeric(12, 2), default=0)  # Общая сумма покупок
    purchase_count = Column(Integer, default=0)  # Количество покупок
    average_check = Column(Numeric(10, 2), default=0)  # Средний чек
    last_purchase_date = Column(Date)
    ltv = Column(Numeric(12, 2), default=0)  # Lifetime Value
    
    # RFM метрики
    recency = Column(Integer)  # Дней с последней покупки
    frequency = Column(Integer)  # Частота покупок
    monetary = Column(Numeric(12, 2))  # Денежная ценность
    
    # Дополнительная информация
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    company = relationship("Company", backref="customers")
    segment = relationship("CustomerSegment", back_populates="customers")
    purchases = relationship("CustomerPurchase", back_populates="customer", cascade="all, delete-orphan")
    interactions = relationship("CustomerInteraction", back_populates="customer", cascade="all, delete-orphan")

class CustomerSegment(Base):
    __tablename__ = "customer_segments"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(Text)
    color = Column(String, default="#4a90e2")  # Цвет для визуализации
    
    # Критерии сегментации
    min_purchase_amount = Column(Numeric(12, 2))
    max_purchase_amount = Column(Numeric(12, 2))
    min_purchase_count = Column(Integer)
    max_purchase_count = Column(Integer)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    company = relationship("Company", backref="customer_segments")
    customers = relationship("Customer", back_populates="segment")

class CustomerPurchase(Base):
    __tablename__ = "customer_purchases"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    realization_id = Column(Integer, ForeignKey("realizations.id"), nullable=True)
    
    purchase_date = Column(Date, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, default=0)
    
    sales_channel_id = Column(Integer, ForeignKey("sales_channels.id"), nullable=True)
    
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    customer = relationship("Customer", back_populates="purchases")
    realization = relationship("Realization")
    sales_channel = relationship("SalesChannel")

class CustomerInteraction(Base):
    __tablename__ = "customer_interactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    interaction_type = Column(String, nullable=False)  # call, email, meeting, note, etc.
    interaction_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    subject = Column(String)
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    customer = relationship("Customer", back_populates="interactions")
    user = relationship("User")

