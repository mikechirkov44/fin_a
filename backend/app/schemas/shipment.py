from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

class ShipmentCreate(BaseModel):
    date: date
    company_id: int
    product_id: int | None = None
    sales_channel_id: int
    quantity: int
    cost_price: Decimal
    description: str | None = None

class ShipmentResponse(BaseModel):
    id: int
    date: date
    company_id: int
    product_id: int | None
    sales_channel_id: int
    quantity: int
    cost_price: Decimal
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True

