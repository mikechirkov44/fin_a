from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ReportScheduleCreate(BaseModel):
    user_id: int
    report_template_id: int
    company_id: Optional[int] = None
    name: str
    frequency: str  # "daily", "weekly", "monthly", "quarterly", "yearly"
    day_of_week: Optional[int] = None  # 0-6
    day_of_month: Optional[int] = None  # 1-31
    month: Optional[int] = None  # 1-12
    time_hour: Optional[int] = 9
    time_minute: Optional[int] = 0
    email_recipients: Optional[List[str]] = None
    export_format: Optional[str] = "pdf"

class ReportScheduleUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    month: Optional[int] = None
    time_hour: Optional[int] = None
    time_minute: Optional[int] = None
    email_recipients: Optional[List[str]] = None
    export_format: Optional[str] = None
    is_active: Optional[bool] = None

class ReportScheduleResponse(BaseModel):
    id: int
    user_id: int
    report_template_id: int
    company_id: Optional[int]
    name: str
    frequency: str
    day_of_week: Optional[int]
    day_of_month: Optional[int]
    month: Optional[int]
    time_hour: int
    time_minute: int
    email_recipients: Optional[List[str]]
    export_format: str
    is_active: bool
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

