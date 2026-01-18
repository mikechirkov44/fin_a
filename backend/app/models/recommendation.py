from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class RecommendationType(str, enum.Enum):
    FINANCIAL = "financial"  # Финансовые рекомендации
    OPERATIONAL = "operational"  # Операционные рекомендации
    ANALYTICAL = "analytical"  # Аналитические рекомендации

class RecommendationPriority(str, enum.Enum):
    CRITICAL = "critical"  # Критично
    IMPORTANT = "important"  # Важно
    INFO = "info"  # Информационно

class RecommendationCategory(str, enum.Enum):
    MARGIN = "margin"  # Маржинальность
    EXPENSES = "expenses"  # Расходы
    CASH_FLOW = "cash_flow"  # Денежные средства
    TURNOVER = "turnover"  # Оборачиваемость
    PRODUCT = "product"  # Товары
    SALES = "sales"  # Продажи
    BUDGET = "budget"  # Бюджет
    TREND = "trend"  # Тренды
    ANOMALY = "anomaly"  # Аномалии

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # Может быть привязана к пользователю
    
    # Тип и категория
    type = Column(SQLEnum(RecommendationType), nullable=False, index=True)
    category = Column(SQLEnum(RecommendationCategory), nullable=False, index=True)
    priority = Column(SQLEnum(RecommendationPriority), nullable=False, index=True, default=RecommendationPriority.INFO)
    
    # Содержание рекомендации
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    action = Column(Text, nullable=True)  # Рекомендуемое действие
    
    # Метаданные (JSON для гибкости)
    meta_data = Column(JSON, nullable=True)  # Дополнительная информация: product_id, expense_item_id и т.д.
    related_table = Column(String(100), nullable=True)  # Таблица, к которой относится рекомендация
    related_id = Column(Integer, nullable=True)  # ID записи
    
    # Статус
    is_dismissed = Column(Boolean, default=False, index=True)
    is_read = Column(Boolean, default=False, index=True)
    dismissed_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Временные метки
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    company = relationship("Company", foreign_keys=[company_id])
    user = relationship("User", foreign_keys=[user_id])
