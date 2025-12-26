"""
Утилита для автоматического логирования изменений в базе данных
"""
from sqlalchemy.orm import Session
from sqlalchemy.inspection import inspect
from app.models.audit import AuditLog
from typing import Optional, Dict, Any
from datetime import datetime, date

def get_table_name(model_instance) -> str:
    """Получить название таблицы из модели"""
    return model_instance.__tablename__

def get_record_id(model_instance) -> int:
    """Получить ID записи"""
    # Используем mapper класса для получения primary key
    mapper = inspect(type(model_instance))
    pk = mapper.primary_key[0]
    return getattr(model_instance, pk.name)

def serialize_value(value: Any) -> Any:
    """Сериализация значения для JSON"""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    # Обработка enum'ов - получаем их значение
    if hasattr(value, 'value') and hasattr(value, 'name'):
        # Это похоже на enum
        return value.value
    # Обработка Decimal и других числовых типов
    if hasattr(value, '__float__'):
        try:
            return float(value)
        except (ValueError, TypeError):
            pass
    if hasattr(value, '__dict__'):
        return str(value)
    return value

def model_to_dict(model_instance, exclude_fields: Optional[list] = None) -> Dict[str, Any]:
    """Преобразовать модель в словарь"""
    if exclude_fields is None:
        exclude_fields = []
    
    result = {}
    # Используем mapper класса, а не инстанса, чтобы получить columns
    mapper = inspect(type(model_instance))
    
    for column in mapper.columns:
        if column.name not in exclude_fields:
            value = getattr(model_instance, column.name, None)
            result[column.name] = serialize_value(value)
    
    return result

def log_create(
    db: Session,
    model_instance: Any,
    user_id: int,
    description: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Логировать создание записи"""
    table_name = get_table_name(model_instance)
    record_id = get_record_id(model_instance)
    new_values = model_to_dict(model_instance, exclude_fields=['created_at', 'updated_at'])
    
    audit_log = AuditLog(
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action="CREATE",
        new_values=new_values,
        description=description,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()

def log_update(
    db: Session,
    model_instance: Any,
    user_id: int,
    old_values: Optional[Dict[str, Any]] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Логировать обновление записи"""
    table_name = get_table_name(model_instance)
    record_id = get_record_id(model_instance)
    
    if old_values is None:
        # Если старые значения не переданы, пытаемся получить их из состояния объекта
        old_values = {}
    
    new_values = model_to_dict(model_instance, exclude_fields=['created_at', 'updated_at'])
    
    audit_log = AuditLog(
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action="UPDATE",
        old_values=old_values,
        new_values=new_values,
        description=description,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()

def log_delete(
    db: Session,
    model_instance: Any,
    user_id: int,
    description: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Логировать удаление записи"""
    table_name = get_table_name(model_instance)
    record_id = get_record_id(model_instance)
    old_values = model_to_dict(model_instance)
    
    audit_log = AuditLog(
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action="DELETE",
        old_values=old_values,
        description=description,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()

