from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

class ProductCreate(BaseModel):
    name: str
    sku: str
    cost_price: Decimal
    selling_price: Decimal | None = None
    description: str | None = None

class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    cost_price: Decimal
    selling_price: Decimal | None
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

