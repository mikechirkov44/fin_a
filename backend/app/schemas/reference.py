from pydantic import BaseModel
from datetime import datetime

class IncomeItemCreate(BaseModel):
    name: str
    description: str | None = None

class IncomeItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseItemCreate(BaseModel):
    name: str
    description: str | None = None

class ExpenseItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentPlaceCreate(BaseModel):
    name: str
    description: str | None = None

class PaymentPlaceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

