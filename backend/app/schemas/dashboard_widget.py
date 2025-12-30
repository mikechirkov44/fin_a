from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class DashboardWidgetCreate(BaseModel):
    user_id: int
    company_id: Optional[int] = None
    widget_type: str
    widget_config: Dict[str, Any]
    title: Optional[str] = None
    order: Optional[int] = 0

class DashboardWidgetUpdate(BaseModel):
    widget_config: Optional[Dict[str, Any]] = None
    title: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class DashboardWidgetResponse(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int]
    widget_type: str
    widget_config: Dict[str, Any]
    title: Optional[str]
    order: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

