from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

# Импорт UserRole из user.py будет сделан позже, чтобы избежать циклических зависимостей

class UserCompany(Base):
    """Связь пользователей с организациями и их роли в конкретных организациях"""
    __tablename__ = "user_companies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # Роль пользователя в конкретной организации (ADMIN, ACCOUNTANT, MANAGER, VIEWER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="companies")
    company = relationship("Company", backref="user_companies")

