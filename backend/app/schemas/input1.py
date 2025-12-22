from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

class MoneyMovementCreate(BaseModel):
    date: date
    amount: Decimal
    movement_type: str  # 'income' or 'expense'
    company_id: int
    income_item_id: int | None = None
    expense_item_id: int | None = None
    payment_place_id: int
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
    description: str | None
    is_business: bool
    created_at: datetime

    class Config:
        from_attributes = True

