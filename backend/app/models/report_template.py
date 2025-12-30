from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class ReportTemplate(Base):
    __tablename__ = "report_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    name = Column(String, nullable=False)  # Название отчета
    description = Column(Text)  # Описание отчета
    
    # Конфигурация отчета (JSON)
    report_config = Column(JSON, nullable=False)  # {
    #   "data_source": "cash_flow" | "profit_loss" | "balance" | "custom",
    #   "filters": {...},
    #   "grouping": {...},
    #   "columns": [...],
    #   "format": "table" | "chart" | "both",
    #   "chart_type": "line" | "bar" | "pie" | null
    # }
    
    # Параметры отображения
    is_public = Column(Boolean, default=False)  # Доступен ли другим пользователям
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User")
    company = relationship("Company", foreign_keys=[company_id])

