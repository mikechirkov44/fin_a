from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from app.models.user import UserRole

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: Optional[UserRole] = UserRole.VIEWER

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserCompanyCreate(BaseModel):
    user_id: int
    company_id: int
    role: UserRole

class UserCompanyResponse(BaseModel):
    id: int
    user_id: int
    company_id: int
    role: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: datetime | None = None
    companies: Optional[List[UserCompanyResponse]] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

