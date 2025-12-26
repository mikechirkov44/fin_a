from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BudgetCreate(BaseModel):
    company_id: int
    period_type: str  # "month", "quarter", "year"
    period_value: str  # "2024-01", "2024-Q1", "2024"
    budget_type: str  # "income" or "expense"
    income_item_id: Optional[int] = None
    expense_item_id: Optional[int] = None
    planned_amount: float
    description: Optional[str] = None

class BudgetUpdate(BaseModel):
    planned_amount: Optional[float] = None
    description: Optional[str] = None

class BudgetResponse(BaseModel):
    id: int
    company_id: int
    period_type: str
    period_value: str
    budget_type: str
    income_item_id: Optional[int] = None
    expense_item_id: Optional[int] = None
    planned_amount: float
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    company_name: Optional[str] = None
    item_name: Optional[str] = None

    class Config:
        from_attributes = True

class BudgetComparison(BaseModel):
    budget_id: int
    period_type: str
    period_value: str
    budget_type: str
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    planned_amount: float
    actual_amount: float
    deviation: float
    deviation_percent: float

