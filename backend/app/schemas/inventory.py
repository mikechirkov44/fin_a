from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

class InventoryCreate(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: Decimal
    min_stock_level: Optional[Decimal] = 0

class InventoryUpdate(BaseModel):
    quantity: Optional[Decimal] = None
    min_stock_level: Optional[Decimal] = None

class InventoryResponse(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    quantity: Decimal
    min_stock_level: Decimal
    created_at: datetime | None = None
    updated_at: datetime | None = None
    product_name: Optional[str] = None
    warehouse_name: Optional[str] = None

    class Config:
        from_attributes = True

class InventoryTransactionCreate(BaseModel):
    transaction_type: str  # INCOME, OUTCOME, ADJUSTMENT
    product_id: int
    warehouse_id: int
    quantity: Decimal
    cost_price: Decimal
    date: str  # ISO date string
    batch_number: Optional[str] = None
    document_type: Optional[str] = None
    document_id: Optional[int] = None
    description: Optional[str] = None

class InventoryTransactionResponse(BaseModel):
    id: int
    transaction_type: str
    product_id: int
    warehouse_id: int
    quantity: Decimal
    cost_price: Decimal
    date: str
    batch_number: Optional[str] = None
    document_type: Optional[str] = None
    document_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime | None = None
    product_name: Optional[str] = None
    warehouse_name: Optional[str] = None

    class Config:
        from_attributes = True

