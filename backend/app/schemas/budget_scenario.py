from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BudgetScenarioCreate(BaseModel):
    company_id: int
    name: str
    description: Optional[str] = None
    is_default: Optional[bool] = False

class BudgetScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class BudgetScenarioResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

