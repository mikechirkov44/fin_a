from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

class MoneyMovementCreate(BaseModel):
    date: date
    amount: Decimal
    movement_type: str  # 'income' or 'expense'
    company_id: int
    income_item_id: int | None = None
    expense_item_id: int | None = None
    payment_place_id: int
    supplier_id: int | None = None  # Только для income
    description: str | None = None
    is_business: bool = True

class MoneyMovementResponse(BaseModel):
    id: int
    date: date
    amount: Decimal
    movement_type: str
    company_id: int
    income_item_id: int | None
    expense_item_id: int | None
    payment_place_id: int
    supplier_id: int | None
    description: str | None
    is_business: bool
    created_at: datetime
    supplier_name: Optional[str] = None

    class Config:
        from_attributes = True

