from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    action = Column(String(20), nullable=False, index=True)  # CREATE, UPDATE, DELETE
    old_values = Column(JSON, nullable=True)  # Старые значения (для UPDATE/DELETE)
    new_values = Column(JSON, nullable=True)  # Новые значения (для CREATE/UPDATE)
    description = Column(Text, nullable=True)  # Описание изменения
    ip_address = Column(String(45), nullable=True)  # IP адрес пользователя
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

