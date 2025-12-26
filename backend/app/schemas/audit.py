from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    table_name: str
    record_id: int
    action: str
    old_values: Optional[dict[str, Any]] = None
    new_values: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    username: Optional[str] = None  # Имя пользователя для отображения

    class Config:
        from_attributes = True

class AuditLogFilter(BaseModel):
    table_name: Optional[str] = None
    action: Optional[str] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    record_id: Optional[int] = None

