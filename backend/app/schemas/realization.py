from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

class RealizationCreate(BaseModel):
    date: date
    company_id: int
    marketplace_id: int
    revenue: Decimal
    quantity: int = 0
    description: str | None = None

class RealizationResponse(BaseModel):
    id: int
    date: date
    company_id: int
    marketplace_id: int
    revenue: Decimal
    quantity: int
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True

