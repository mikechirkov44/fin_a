from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class BudgetScenario(Base):
    __tablename__ = "budget_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String, nullable=False)  # Название сценария (базовый, оптимистичный, пессимистичный)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Сценарий по умолчанию
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])

