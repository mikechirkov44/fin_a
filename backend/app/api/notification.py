from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationCreate
from app.auth.security import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
def get_notifications(
    skip: int = 0,
    limit: int = 100,
    is_read: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить уведомления текущего пользователя"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить количество непрочитанных уведомлений"""
    count = db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    ).count()
    return {"count": count}

@router.post("/", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать уведомление (обычно используется системой)"""
    db_notification = Notification(
        user_id=notification.user_id,
        type=notification.type,
        title=notification.title,
        message=notification.message,
        related_table=notification.related_table,
        related_id=notification.related_id
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отметить уведомление как прочитанное"""
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.now()
    db.commit()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отметить все уведомления как прочитанные"""
    db.query(Notification).filter(
        and_(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    ).update({"is_read": True, "read_at": datetime.now()})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить уведомление"""
    notification = db.query(Notification).filter(
        and_(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted"}

