from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Realization(Base):
    __tablename__ = "realizations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    marketplace = Column(String, nullable=False)  # 'ozon', 'wb', etc.
    revenue = Column(Numeric(15, 2), nullable=False)
    quantity = Column(Integer, default=0)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

