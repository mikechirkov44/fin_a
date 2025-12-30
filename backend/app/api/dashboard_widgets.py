from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.dashboard_widget import DashboardWidget
from app.schemas.dashboard_widget import (
    DashboardWidgetCreate, DashboardWidgetUpdate, DashboardWidgetResponse
)
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DashboardWidgetResponse])
def get_widgets(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить виджеты дашборда пользователя"""
    query = db.query(DashboardWidget).filter(
        DashboardWidget.user_id == current_user.id,
        DashboardWidget.is_active == True
    )
    
    if company_id:
        query = query.filter(
            (DashboardWidget.company_id == company_id) | (DashboardWidget.company_id.is_(None))
        )
    
    widgets = query.order_by(DashboardWidget.order).all()
    return widgets

@router.post("/", response_model=DashboardWidgetResponse)
def create_widget(
    widget: DashboardWidgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать виджет дашборда"""
    if widget.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot create widget for another user")
    
    db_widget = DashboardWidget(**widget.dict())
    db.add(db_widget)
    db.commit()
    db.refresh(db_widget)
    return db_widget

@router.put("/{widget_id}", response_model=DashboardWidgetResponse)
def update_widget(
    widget_id: int,
    widget_update: DashboardWidgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить виджет дашборда"""
    widget = db.query(DashboardWidget).filter(DashboardWidget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    if widget.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot update widget of another user")
    
    update_data = widget_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(widget, key, value)
    
    db.commit()
    db.refresh(widget)
    return widget

@router.delete("/{widget_id}")
def delete_widget(
    widget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить виджет дашборда"""
    widget = db.query(DashboardWidget).filter(DashboardWidget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    
    if widget.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete widget of another user")
    
    widget.is_active = False
    db.commit()
    return {"message": "Widget deleted"}

@router.post("/reorder")
def reorder_widgets(
    widget_orders: List[dict],  # [{id: 1, order: 0}, {id: 2, order: 1}, ...]
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Изменить порядок виджетов"""
    for item in widget_orders:
        widget = db.query(DashboardWidget).filter(
            DashboardWidget.id == item["id"],
            DashboardWidget.user_id == current_user.id
        ).first()
        if widget:
            widget.order = item["order"]
    
    db.commit()
    return {"message": "Widgets reordered"}

