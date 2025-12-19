from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

class ShipmentCreate(BaseModel):
    date: date
    product_id: int | None = None
    marketplace: str
    quantity: int
    cost_price: Decimal
    description: str | None = None

class ShipmentResponse(BaseModel):
    id: int
    date: date
    product_id: int | None
    marketplace: str
    quantity: int
    cost_price: Decimal
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True

