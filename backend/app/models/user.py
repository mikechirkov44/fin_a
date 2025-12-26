from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"  # Администратор - полный доступ ко всем организациям
    ACCOUNTANT = "ACCOUNTANT"  # Бухгалтер - полный доступ к финансовым данным
    MANAGER = "MANAGER"  # Менеджер - доступ к операционным данным
    VIEWER = "VIEWER"  # Просмотр - только чтение

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)  # Глобальная роль по умолчанию
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Связь с организациями через промежуточную таблицу
    companies = relationship("UserCompany", back_populates="user", cascade="all, delete-orphan")

