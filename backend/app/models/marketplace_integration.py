from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class MarketplaceIntegration(Base):
    __tablename__ = "marketplace_integrations"

    id = Column(Integer, primary_key=True, index=True)
    marketplace_name = Column(String, nullable=False, index=True)  # Название маркетплейса (OZON, Wildberries и т.д.)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    
    # OZON API credentials
    ozon_client_id = Column(String, nullable=True)
    ozon_api_key = Column(Text, nullable=True)  # Используем Text для длинных ключей
    
    # Wildberries API credentials
    wb_api_key = Column(Text, nullable=True)
    wb_stat_api_key = Column(Text, nullable=True)  # Для статистики
    
    # Общие настройки
    is_active = Column(Boolean, default=True)
    auto_sync = Column(Boolean, default=False)  # Автоматическая синхронизация
    sync_interval_hours = Column(Integer, default=24)  # Интервал синхронизации в часах
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_status = Column(String, nullable=True)  # 'success', 'error', 'in_progress'
    last_sync_error = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])

