from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class WarehouseCreate(BaseModel):
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    company_id: int
    is_active: bool = True

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class WarehouseResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    description: Optional[str] = None
    company_id: int
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

