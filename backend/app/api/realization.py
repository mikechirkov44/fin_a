from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.realization import Realization
from app.schemas.realization import RealizationCreate, RealizationResponse
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[RealizationResponse])
def get_realizations(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    marketplace: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Realization)
    
    if start_date:
        query = query.filter(Realization.date >= start_date)
    if end_date:
        query = query.filter(Realization.date <= end_date)
    if marketplace:
        query = query.filter(Realization.marketplace == marketplace)
    
    realizations = query.order_by(Realization.date.desc()).offset(skip).limit(limit).all()
    return realizations

@router.post("/", response_model=RealizationResponse)
def create_realization(
    realization: RealizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = Realization(**realization.dict())
    db.add(db_realization)
    db.commit()
    db.refresh(db_realization)
    return db_realization

@router.put("/{realization_id}", response_model=RealizationResponse)
def update_realization(
    realization_id: int,
    realization: RealizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    for key, value in realization.dict().items():
        setattr(db_realization, key, value)
    db.commit()
    db.refresh(db_realization)
    return db_realization

@router.delete("/{realization_id}")
def delete_realization(
    realization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_realization = db.query(Realization).filter(Realization.id == realization_id).first()
    if not db_realization:
        raise HTTPException(status_code=404, detail="Realization not found")
    db.delete(db_realization)
    db.commit()
    return {"message": "Realization deleted"}

