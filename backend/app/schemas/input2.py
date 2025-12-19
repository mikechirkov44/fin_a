from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

class AssetCreate(BaseModel):
    name: str
    category: str  # 'current', 'fixed', 'intangible'
    value: Decimal
    date: date
    description: str | None = None

class AssetResponse(BaseModel):
    id: int
    name: str
    category: str
    value: Decimal
    date: date
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True

class LiabilityCreate(BaseModel):
    name: str
    category: str  # 'short_term', 'long_term'
    value: Decimal
    date: date
    description: str | None = None

class LiabilityResponse(BaseModel):
    id: int
    name: str
    category: str
    value: Decimal
    date: date
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True

