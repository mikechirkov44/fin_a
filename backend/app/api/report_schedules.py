from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.report_schedule import ReportSchedule, ScheduleFrequency
from app.schemas.report_schedule import (
    ReportScheduleCreate, ReportScheduleUpdate, ReportScheduleResponse
)
from app.auth.security import get_current_user

router = APIRouter()

def calculate_next_run(schedule: ReportSchedule) -> datetime:
    """Рассчитать следующее время выполнения расписания"""
    now = datetime.now()
    
    # Базовое время (сегодня в указанное время)
    base_time = now.replace(
        hour=schedule.time_hour or 9,
        minute=schedule.time_minute or 0,
        second=0,
        microsecond=0
    )
    
    if schedule.frequency == ScheduleFrequency.DAILY:
        if base_time <= now:
            base_time += timedelta(days=1)
        return base_time
    
    elif schedule.frequency == ScheduleFrequency.WEEKLY:
        # День недели (0 = понедельник, 6 = воскресенье)
        target_day = schedule.day_of_week or 0
        current_day = now.weekday()
        days_ahead = target_day - current_day
        
        if days_ahead < 0 or (days_ahead == 0 and base_time <= now):
            days_ahead += 7
        
        return base_time + timedelta(days=days_ahead)
    
    elif schedule.frequency == ScheduleFrequency.MONTHLY:
        target_day = schedule.day_of_month or 1
        # Если день месяца уже прошел, переходим на следующий месяц
        if target_day < now.day or (target_day == now.day and base_time <= now):
            # Следующий месяц
            if now.month == 12:
                next_month = now.replace(year=now.year + 1, month=1, day=target_day)
            else:
                next_month = now.replace(month=now.month + 1, day=target_day)
            return next_month.replace(hour=schedule.time_hour or 9, minute=schedule.time_minute or 0)
        else:
            return now.replace(day=target_day, hour=schedule.time_hour or 9, minute=schedule.time_minute or 0)
    
    elif schedule.frequency == ScheduleFrequency.QUARTERLY:
        # Кварталы: Q1 (янв-мар), Q2 (апр-июн), Q3 (июл-сен), Q4 (окт-дек)
        current_quarter = (now.month - 1) // 3 + 1
        target_day = schedule.day_of_month or 1
        
        # Определяем месяц следующего квартала
        next_quarter_month = ((current_quarter % 4) * 3) + 1
        if next_quarter_month == 13:
            next_quarter_month = 1
            next_year = now.year + 1
        else:
            next_year = now.year
        
        return datetime(next_year, next_quarter_month, target_day, 
                       schedule.time_hour or 9, schedule.time_minute or 0)
    
    elif schedule.frequency == ScheduleFrequency.YEARLY:
        target_month = schedule.month or 1
        target_day = schedule.day_of_month or 1
        
        if target_month < now.month or (target_month == now.month and target_day < now.day) or \
           (target_month == now.month and target_day == now.day and base_time <= now):
            return datetime(now.year + 1, target_month, target_day,
                          schedule.time_hour or 9, schedule.time_minute or 0)
        else:
            return datetime(now.year, target_month, target_day,
                          schedule.time_hour or 9, schedule.time_minute or 0)
    
    return base_time

@router.get("/", response_model=List[ReportScheduleResponse])
def get_schedules(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список расписаний отчетов"""
    query = db.query(ReportSchedule).filter(ReportSchedule.is_active == True)
    
    if current_user.role.value != "ADMIN":
        query = query.filter(ReportSchedule.user_id == current_user.id)
    
    if company_id:
        query = query.filter(
            (ReportSchedule.company_id == company_id) | (ReportSchedule.company_id.is_(None))
        )
    
    schedules = query.order_by(ReportSchedule.next_run_at).all()
    return schedules

@router.post("/", response_model=ReportScheduleResponse)
def create_schedule(
    schedule: ReportScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новое расписание отчетов"""
    if schedule.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot create schedule for another user")
    
    try:
        frequency_enum = ScheduleFrequency(schedule.frequency)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid frequency: {schedule.frequency}")
    
    db_schedule = ReportSchedule(
        user_id=schedule.user_id,
        report_template_id=schedule.report_template_id,
        company_id=schedule.company_id,
        name=schedule.name,
        frequency=frequency_enum,
        day_of_week=schedule.day_of_week,
        day_of_month=schedule.day_of_month,
        month=schedule.month,
        time_hour=schedule.time_hour or 9,
        time_minute=schedule.time_minute or 0,
        email_recipients=schedule.email_recipients,
        export_format=schedule.export_format or "pdf"
    )
    
    # Рассчитываем следующее время выполнения
    db_schedule.next_run_at = calculate_next_run(db_schedule)
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@router.put("/{schedule_id}", response_model=ReportScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_update: ReportScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить расписание отчетов"""
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot update schedule of another user")
    
    update_data = schedule_update.dict(exclude_unset=True)
    
    # Если изменилась частота или время, пересчитываем next_run_at
    if "frequency" in update_data:
        try:
            schedule.frequency = ScheduleFrequency(update_data["frequency"])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid frequency: {update_data['frequency']}")
    
    for key, value in update_data.items():
        if key != "frequency":
            setattr(schedule, key, value)
    
    # Пересчитываем следующее время выполнения
    schedule.next_run_at = calculate_next_run(schedule)
    
    db.commit()
    db.refresh(schedule)
    return schedule

@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить расписание отчетов"""
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete schedule of another user")
    
    schedule.is_active = False
    db.commit()
    return {"message": "Schedule deleted"}

@router.post("/{schedule_id}/run")
def run_schedule_now(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Запустить расписание немедленно"""
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    if schedule.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot run schedule of another user")
    
    # Здесь будет логика генерации и отправки отчета
    # Пока возвращаем заглушку
    schedule.last_run_at = datetime.now()
    schedule.next_run_at = calculate_next_run(schedule)
    db.commit()
    
    return {
        "message": "Schedule executed",
        "schedule_id": schedule_id,
        "next_run_at": schedule.next_run_at.isoformat()
    }

