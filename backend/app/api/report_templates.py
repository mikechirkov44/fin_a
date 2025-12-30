from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.report_template import ReportTemplate
from app.schemas.report_template import (
    ReportTemplateCreate, ReportTemplateUpdate, ReportTemplateResponse
)
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[ReportTemplateResponse])
def get_templates(
    company_id: Optional[int] = None,
    include_public: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список шаблонов отчетов"""
    query = db.query(ReportTemplate).filter(ReportTemplate.is_active == True)
    
    # Фильтр по пользователю или публичным шаблонам
    if include_public:
        query = query.filter(
            (ReportTemplate.user_id == current_user.id) | (ReportTemplate.is_public == True)
        )
    else:
        query = query.filter(ReportTemplate.user_id == current_user.id)
    
    if company_id:
        query = query.filter(
            (ReportTemplate.company_id == company_id) | (ReportTemplate.company_id.is_(None))
        )
    
    templates = query.order_by(ReportTemplate.created_at.desc()).all()
    return templates

@router.post("/", response_model=ReportTemplateResponse)
def create_template(
    template: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новый шаблон отчета"""
    if template.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot create template for another user")
    
    db_template = ReportTemplate(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/{template_id}", response_model=ReportTemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить шаблон отчета по ID"""
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Проверка доступа
    if template.user_id != current_user.id and not template.is_public and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return template

@router.put("/{template_id}", response_model=ReportTemplateResponse)
def update_template(
    template_id: int,
    template_update: ReportTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить шаблон отчета"""
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot update template of another user")
    
    update_data = template_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    return template

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить шаблон отчета"""
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template.user_id != current_user.id and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete template of another user")
    
    template.is_active = False
    db.commit()
    return {"message": "Template deleted"}

@router.post("/{template_id}/generate")
def generate_report(
    template_id: int,
    params: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Сгенерировать отчет по шаблону"""
    template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Проверка доступа
    if template.user_id != current_user.id and not template.is_public and current_user.role.value != "ADMIN":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Здесь будет логика генерации отчета на основе report_config
    # Пока возвращаем заглушку
    return {
        "message": "Report generation not implemented yet",
        "template_id": template_id,
        "config": template.report_config
    }

