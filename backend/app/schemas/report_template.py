from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class ReportTemplateCreate(BaseModel):
    user_id: int
    company_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    report_config: Dict[str, Any]
    is_public: Optional[bool] = False

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    report_config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

class ReportTemplateResponse(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int]
    name: str
    description: Optional[str]
    report_config: Dict[str, Any]
    is_public: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

