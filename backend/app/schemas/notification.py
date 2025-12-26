from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    related_table: Optional[str] = None
    related_id: Optional[int] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    user_id: int
    type: str
    title: str
    message: str
    related_table: Optional[str] = None
    related_id: Optional[int] = None

