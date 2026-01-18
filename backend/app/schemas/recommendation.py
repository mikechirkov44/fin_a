from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.recommendation import RecommendationType, RecommendationPriority, RecommendationCategory

class RecommendationBase(BaseModel):
    company_id: int
    type: RecommendationType
    category: RecommendationCategory
    priority: RecommendationPriority = RecommendationPriority.INFO
    title: str
    description: str
    action: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None
    related_table: Optional[str] = None
    related_id: Optional[int] = None

class RecommendationCreate(RecommendationBase):
    user_id: Optional[int] = None

class RecommendationUpdate(BaseModel):
    is_dismissed: Optional[bool] = None
    is_read: Optional[bool] = None

class RecommendationResponse(RecommendationBase):
    id: int
    user_id: Optional[int] = None
    is_dismissed: bool
    is_read: bool
    dismissed_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RecommendationStats(BaseModel):
    total: int
    critical: int
    important: int
    info: int
    unread: int
    by_type: Dict[str, int]
    by_category: Dict[str, int]
