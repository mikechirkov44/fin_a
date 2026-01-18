from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.recommendation import Recommendation, RecommendationType, RecommendationPriority, RecommendationCategory
from app.schemas.recommendation import (
    RecommendationResponse, RecommendationCreate, RecommendationUpdate, RecommendationStats
)
from app.auth.security import get_current_user
from app.auth.permissions import filter_by_user_companies

router = APIRouter()

@router.get("/", response_model=List[RecommendationResponse])
def get_recommendations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    company_id: Optional[int] = Query(None),
    type: Optional[RecommendationType] = Query(None),
    category: Optional[RecommendationCategory] = Query(None),
    priority: Optional[RecommendationPriority] = Query(None),
    is_dismissed: Optional[bool] = Query(None),
    is_read: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список рекомендаций"""
    query = db.query(Recommendation)
    
    # Фильтр по организации
    if company_id:
        query = query.filter(Recommendation.company_id == company_id)
    else:
        # Фильтрация по доступным организациям пользователя
        query = filter_by_user_companies(query, current_user, Recommendation.company_id, db)
    
    # Фильтр по user_id: показываем рекомендации для текущего пользователя или общие (user_id = None)
    query = query.filter(
        (Recommendation.user_id == current_user.id) | (Recommendation.user_id.is_(None))
    )
    
    # Применяем фильтры
    if type:
        query = query.filter(Recommendation.type == type)
    if category:
        query = query.filter(Recommendation.category == category)
    if priority:
        query = query.filter(Recommendation.priority == priority)
    if is_dismissed is not None:
        query = query.filter(Recommendation.is_dismissed == is_dismissed)
    if is_read is not None:
        query = query.filter(Recommendation.is_read == is_read)
    
    recommendations = query.order_by(
        Recommendation.priority.desc(),
        Recommendation.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return recommendations

@router.get("/stats", response_model=RecommendationStats)
def get_recommendations_stats(
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить статистику по рекомендациям"""
    query = db.query(Recommendation).filter(Recommendation.is_dismissed == False)
    
    # Фильтр по организации
    if company_id:
        query = query.filter(Recommendation.company_id == company_id)
    else:
        query = filter_by_user_companies(query, current_user, Recommendation.company_id, db)
    
    # Фильтр по user_id: показываем рекомендации для текущего пользователя или общие (user_id = None)
    query = query.filter(
        (Recommendation.user_id == current_user.id) | (Recommendation.user_id.is_(None))
    )
    
    total = query.count()
    critical = query.filter(Recommendation.priority == RecommendationPriority.CRITICAL).count()
    important = query.filter(Recommendation.priority == RecommendationPriority.IMPORTANT).count()
    info = query.filter(Recommendation.priority == RecommendationPriority.INFO).count()
    unread = query.filter(Recommendation.is_read == False).count()
    
    # Статистика по типам
    by_type = {}
    for rec_type in RecommendationType:
        count = query.filter(Recommendation.type == rec_type).count()
        by_type[rec_type.value] = count
    
    # Статистика по категориям
    by_category = {}
    for category in RecommendationCategory:
        count = query.filter(Recommendation.category == category).count()
        by_category[category.value] = count
    
    return RecommendationStats(
        total=total,
        critical=critical,
        important=important,
        info=info,
        unread=unread,
        by_type=by_type,
        by_category=by_category
    )

@router.post("/", response_model=RecommendationResponse)
def create_recommendation(
    recommendation: RecommendationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать рекомендацию (обычно используется системой)"""
    db_recommendation = Recommendation(
        company_id=recommendation.company_id,
        user_id=recommendation.user_id or current_user.id,
        type=recommendation.type,
        category=recommendation.category,
        priority=recommendation.priority,
        title=recommendation.title,
        description=recommendation.description,
        action=recommendation.action,
        meta_data=recommendation.meta_data,
        related_table=recommendation.related_table,
        related_id=recommendation.related_id
    )
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

@router.put("/{recommendation_id}", response_model=RecommendationResponse)
def update_recommendation(
    recommendation_id: int,
    update: RecommendationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить рекомендацию"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    # Проверка доступа к организации
    from app.auth.permissions import get_user_companies
    if current_user.role.value != "ADMIN":
        user_companies = get_user_companies(current_user.id, db)
        if recommendation.company_id not in user_companies:
            raise HTTPException(status_code=403, detail="No access to this recommendation")
    
    if update.is_dismissed is not None:
        recommendation.is_dismissed = update.is_dismissed
        recommendation.dismissed_at = datetime.now() if update.is_dismissed else None
    
    if update.is_read is not None:
        recommendation.is_read = update.is_read
        recommendation.read_at = datetime.now() if update.is_read else None
    
    db.commit()
    db.refresh(recommendation)
    return recommendation

@router.put("/{recommendation_id}/dismiss")
def dismiss_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отклонить рекомендацию"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    recommendation.is_dismissed = True
    recommendation.dismissed_at = datetime.now()
    db.commit()
    
    return {"message": "Recommendation dismissed"}

@router.put("/{recommendation_id}/read")
def mark_recommendation_as_read(
    recommendation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отметить рекомендацию как прочитанную"""
    recommendation = db.query(Recommendation).filter(
        Recommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    recommendation.is_read = True
    recommendation.read_at = datetime.now()
    db.commit()
    
    return {"message": "Recommendation marked as read"}

@router.post("/generate")
def generate_recommendations(
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Сгенерировать новые рекомендации на основе текущих данных"""
    from app.services.recommendation_service import RecommendationService
    
    try:
        service = RecommendationService(db)
        companies = []
        
        if company_id:
            from app.auth.permissions import get_user_companies
            if current_user.role.value != "ADMIN":
                user_companies = get_user_companies(current_user.id, db)
                if company_id not in user_companies:
                    raise HTTPException(status_code=403, detail="No access to this company")
            companies = [company_id]
        else:
            # Получаем все доступные компании
            from app.auth.permissions import get_user_companies
            companies = get_user_companies(current_user.id, db)
        
        generated = 0
        for comp_id in companies:
            # Создаем общие рекомендации (user_id=None), чтобы они были видны всем пользователям компании
            try:
                count = service.generate_recommendations(comp_id, user_id=None)
                generated += count
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                print(f"Error generating recommendations for company {comp_id}: {str(e)}")
                print(error_detail)
                # Продолжаем для других компаний, но логируем ошибку
                continue
        
        return {"message": f"Generated {generated} recommendations", "count": generated}
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in generate_recommendations endpoint: {str(e)}")
        print(error_detail)
        raise HTTPException(status_code=500, detail=f"Ошибка при генерации рекомендаций: {str(e)}")
