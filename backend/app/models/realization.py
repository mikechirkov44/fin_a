from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Realization(Base):
    __tablename__ = "realizations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    marketplace_id = Column(Integer, ForeignKey("marketplaces.id"), nullable=False)
    revenue = Column(Numeric(15, 2), nullable=False)
    quantity = Column(Integer, default=0)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", foreign_keys=[company_id])
    marketplace = relationship("Marketplace", foreign_keys=[marketplace_id])

