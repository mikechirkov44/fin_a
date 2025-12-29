from pydantic import BaseModel
from datetime import datetime

class IncomeGroupCreate(BaseModel):
    name: str
    description: str | None = None
    parent_group_id: int | None = None
    subgroup_type: str | None = None  # 'income' или 'expense' для подгрупп

class IncomeGroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    parent_group_id: int | None
    subgroup_type: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class IncomeItemCreate(BaseModel):
    name: str
    description: str | None = None
    group_id: int | None = None

class IncomeItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    group_id: int | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseGroupCreate(BaseModel):
    name: str
    description: str | None = None
    parent_group_id: int | None = None
    subgroup_type: str | None = None  # 'income' или 'expense' для подгрупп

class ExpenseGroupResponse(BaseModel):
    id: int
    name: str
    description: str | None
    parent_group_id: int | None
    subgroup_type: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseItemCreate(BaseModel):
    name: str
    description: str | None = None
    group_id: int | None = None

class ExpenseItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    group_id: int | None
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

class CompanyCreate(BaseModel):
    name: str
    description: str | None = None

class CompanyResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: str | None = None

class ExpenseCategoryResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SalesChannelCreate(BaseModel):
    name: str
    description: str | None = None

class SalesChannelResponse(BaseModel):
    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

