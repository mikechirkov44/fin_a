from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

# Supplier Schemas
class SupplierCreate(BaseModel):
    name: str
    company_id: int
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    legal_address: Optional[str] = None
    actual_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    correspondent_account: Optional[str] = None
    bik: Optional[str] = None
    description: Optional[str] = None
    rating: Optional[float] = 0

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    legal_address: Optional[str] = None
    actual_address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    correspondent_account: Optional[str] = None
    bik: Optional[str] = None
    description: Optional[str] = None
    rating: Optional[float] = None
    is_active: Optional[bool] = None

class SupplierResponse(BaseModel):
    id: int
    name: str
    company_id: int
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    inn: Optional[str]
    kpp: Optional[str]
    ogrn: Optional[str]
    legal_address: Optional[str]
    actual_address: Optional[str]
    bank_name: Optional[str]
    bank_account: Optional[str]
    correspondent_account: Optional[str]
    bik: Optional[str]
    description: Optional[str]
    rating: Optional[Decimal]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Supplier Order Schemas
class SupplierOrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: float
    unit_price: float
    total_price: float
    description: Optional[str] = None

class SupplierOrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: Optional[int]
    product_name: str
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal
    description: Optional[str]

    class Config:
        from_attributes = True

class SupplierOrderCreate(BaseModel):
    supplier_id: int
    company_id: int
    order_number: str
    order_date: date
    expected_delivery_date: Optional[date] = None
    status: Optional[str] = "pending"
    description: Optional[str] = None
    items: List[SupplierOrderItemCreate]

class SupplierOrderUpdate(BaseModel):
    order_number: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None

class SupplierOrderResponse(BaseModel):
    id: int
    supplier_id: int
    company_id: int
    order_number: str
    order_date: date
    expected_delivery_date: Optional[date]
    actual_delivery_date: Optional[date]
    status: str
    total_amount: Decimal
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[SupplierOrderItemResponse] = []

    class Config:
        from_attributes = True

# Supplier Contract Schemas
class SupplierContractCreate(BaseModel):
    supplier_id: int
    company_id: int
    contract_number: str
    contract_date: date
    start_date: date
    end_date: Optional[date] = None
    contract_type: Optional[str] = "supply"
    total_amount: Optional[float] = None
    description: Optional[str] = None
    file_path: Optional[str] = None

class SupplierContractUpdate(BaseModel):
    contract_number: Optional[str] = None
    contract_date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    contract_type: Optional[str] = None
    total_amount: Optional[float] = None
    description: Optional[str] = None
    file_path: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierContractResponse(BaseModel):
    id: int
    supplier_id: int
    company_id: int
    contract_number: str
    contract_date: date
    start_date: date
    end_date: Optional[date]
    contract_type: str
    total_amount: Optional[Decimal]
    description: Optional[str]
    file_path: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

