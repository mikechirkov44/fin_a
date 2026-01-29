from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

class RealizationItemCreate(BaseModel):
    product_id: int
    quantity: int
    price: Decimal
    cost_price: Decimal

class RealizationItemResponse(BaseModel):
    id: int
    realization_id: int
    product_id: int
    quantity: int
    price: Decimal
    cost_price: Decimal
    created_at: datetime
    product_name: Optional[str] = None

    class Config:
        from_attributes = True

class RealizationCreate(BaseModel):
    date: date
    company_id: int
    sales_channel_id: int
    customer_id: int
    warehouse_id: int
    description: str | None = None
    items: List[RealizationItemCreate]

class RealizationResponse(BaseModel):
    id: int
    date: date
    company_id: int
    sales_channel_id: int
    customer_id: Optional[int] = None  # Опциональное для поддержки старых записей
    warehouse_id: Optional[int] = None  # Опциональное для поддержки старых записей
    revenue: Decimal
    quantity: int
    description: str | None
    created_at: datetime
    items: List[RealizationItemResponse] = []
    customer_name: Optional[str] = None
    warehouse_name: Optional[str] = None

    class Config:
        from_attributes = True

