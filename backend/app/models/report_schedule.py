from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class ScheduleFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class ReportSchedule(Base):
    __tablename__ = "report_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_template_id = Column(Integer, ForeignKey("report_templates.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    name = Column(String, nullable=False)  # Название расписания
    frequency = Column(SQLEnum(ScheduleFrequency), nullable=False)  # Частота генерации
    day_of_week = Column(Integer, nullable=True)  # День недели (0-6, для weekly)
    day_of_month = Column(Integer, nullable=True)  # День месяца (1-31, для monthly)
    month = Column(Integer, nullable=True)  # Месяц (1-12, для yearly)
    
    # Время генерации
    time_hour = Column(Integer, default=9)  # Час (0-23)
    time_minute = Column(Integer, default=0)  # Минута (0-59)
    
    # Параметры отправки
    email_recipients = Column(JSON)  # Список email адресов
    export_format = Column(String, default="pdf")  # pdf, excel, csv
    
    # Статус
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User")
    report_template = relationship("ReportTemplate", foreign_keys=[report_template_id])
    company = relationship("Company", foreign_keys=[company_id])

