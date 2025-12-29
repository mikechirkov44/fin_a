from pydantic import BaseModel
from typing import List, TypeVar, Generic

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Общая схема для пагинированных ответов"""
    items: List[T]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True

