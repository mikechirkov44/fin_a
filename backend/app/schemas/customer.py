from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

# Customer Segment Schemas
class CustomerSegmentCreate(BaseModel):
    company_id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#4a90e2"
    min_purchase_amount: Optional[float] = None
    max_purchase_amount: Optional[float] = None
    min_purchase_count: Optional[int] = None
    max_purchase_count: Optional[int] = None

class CustomerSegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    min_purchase_amount: Optional[float] = None
    max_purchase_amount: Optional[float] = None
    min_purchase_count: Optional[int] = None
    max_purchase_count: Optional[int] = None
    is_active: Optional[bool] = None

class CustomerSegmentResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    color: str
    min_purchase_amount: Optional[Decimal]
    max_purchase_amount: Optional[Decimal]
    min_purchase_count: Optional[int]
    max_purchase_count: Optional[int]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerCreate(BaseModel):
    company_id: int
    name: str
    type: Optional[str] = "individual"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    legal_name: Optional[str] = None
    segment_id: Optional[int] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    legal_name: Optional[str] = None
    segment_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class CustomerResponse(BaseModel):
    id: int
    company_id: int
    name: str
    type: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    inn: Optional[str]
    kpp: Optional[str]
    legal_name: Optional[str]
    segment_id: Optional[int]
    total_purchases: Decimal
    purchase_count: int
    average_check: Decimal
    last_purchase_date: Optional[date]
    ltv: Decimal
    recency: Optional[int]
    frequency: Optional[int]
    monetary: Optional[Decimal]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Customer Purchase Schemas
class CustomerPurchaseCreate(BaseModel):
    customer_id: int
    realization_id: Optional[int] = None
    purchase_date: date
    amount: float
    quantity: Optional[int] = 0
    sales_channel_id: Optional[int] = None
    description: Optional[str] = None

class CustomerPurchaseResponse(BaseModel):
    id: int
    customer_id: int
    realization_id: Optional[int]
    purchase_date: date
    amount: Decimal
    quantity: int
    sales_channel_id: Optional[int]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Interaction Schemas
class CustomerInteractionCreate(BaseModel):
    customer_id: int
    user_id: Optional[int] = None
    interaction_type: str
    interaction_date: Optional[datetime] = None
    subject: Optional[str] = None
    description: Optional[str] = None

class CustomerInteractionResponse(BaseModel):
    id: int
    customer_id: int
    user_id: Optional[int]
    interaction_type: str
    interaction_date: datetime
    subject: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

