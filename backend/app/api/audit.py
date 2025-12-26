from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, date
from typing import Optional
from app.database import get_db
from app.auth.security import get_current_user
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditLogFilter
from typing import List

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    table_name: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    record_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить историю изменений с фильтрацией
    """
    query = db.query(AuditLog)
    
    # Применяем фильтры
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
    
    # Получаем логи с информацией о пользователе
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    # Добавляем имена пользователей
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "action": log.action,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "description": log.description,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "username": user.username if user else None
        }
        result.append(AuditLogResponse(**log_dict))
    
    return result

@router.get("/logs/{record_id}", response_model=List[AuditLogResponse])
def get_audit_logs_by_record(
    record_id: int,
    table_name: str = Query(..., description="Название таблицы"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить историю изменений конкретной записи
    """
    logs = db.query(AuditLog).filter(
        and_(
            AuditLog.record_id == record_id,
            AuditLog.table_name == table_name
        )
    ).order_by(AuditLog.created_at.desc()).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "action": log.action,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "description": log.description,
            "ip_address": log.ip_address,
            "created_at": log.created_at,
            "username": user.username if user else None
        }
        result.append(AuditLogResponse(**log_dict))
    
    return result

@router.get("/stats")
def get_audit_stats(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получить статистику по аудиту
    """
    query = db.query(AuditLog)
    
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    total_logs = query.count()
    
    # Статистика по действиям (с применением фильтров по датам)
    action_query = db.query(AuditLog.action, func.count(AuditLog.id))
    if start_date:
        action_query = action_query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        action_query = action_query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    actions = action_query.group_by(AuditLog.action).all()
    action_stats = {action: count for action, count in actions}
    
    # Статистика по таблицам (с применением фильтров по датам)
    table_query = db.query(AuditLog.table_name, func.count(AuditLog.id))
    if start_date:
        table_query = table_query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        table_query = table_query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    tables = table_query.group_by(AuditLog.table_name).all()
    table_stats = {table: count for table, count in tables}
    
    # Статистика по пользователям (с применением фильтров по датам)
    user_query = db.query(AuditLog.user_id, func.count(AuditLog.id))
    if start_date:
        user_query = user_query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        user_query = user_query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    users = user_query.group_by(AuditLog.user_id).all()
    user_stats = {user_id: count for user_id, count in users}
    
    return {
        "total_logs": total_logs,
        "action_stats": action_stats,
        "table_stats": table_stats,
        "user_stats": user_stats
    }

