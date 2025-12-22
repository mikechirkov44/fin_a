from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input2 import Asset, Liability
from app.schemas.input2 import AssetCreate, AssetResponse, LiabilityCreate, LiabilityResponse
from app.auth.security import get_current_user

router = APIRouter()

# Assets
@router.get("/assets", response_model=List[AssetResponse])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    category: str | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Asset)
    
    if start_date:
        query = query.filter(Asset.date >= start_date)
    if end_date:
        query = query.filter(Asset.date <= end_date)
    if category:
        query = query.filter(Asset.category == category)
    if company_id:
        query = query.filter(Asset.company_id == company_id)
    
    assets = query.order_by(Asset.date.desc()).offset(skip).limit(limit).all()
    return assets

@router.post("/assets", response_model=AssetResponse)
def create_asset(
    asset: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_asset = Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.put("/assets/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    asset: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for key, value in asset.dict().items():
        setattr(db_asset, key, value)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/assets/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not db_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(db_asset)
    db.commit()
    return {"message": "Asset deleted"}

# Liabilities
@router.get("/liabilities", response_model=List[LiabilityResponse])
def get_liabilities(
    skip: int = 0,
    limit: int = 100,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    category: str | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Liability)
    
    if start_date:
        query = query.filter(Liability.date >= start_date)
    if end_date:
        query = query.filter(Liability.date <= end_date)
    if category:
        query = query.filter(Liability.category == category)
    if company_id:
        query = query.filter(Liability.company_id == company_id)
    
    liabilities = query.order_by(Liability.date.desc()).offset(skip).limit(limit).all()
    return liabilities

@router.post("/liabilities", response_model=LiabilityResponse)
def create_liability(
    liability: LiabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_liability = Liability(**liability.dict())
    db.add(db_liability)
    db.commit()
    db.refresh(db_liability)
    return db_liability

@router.put("/liabilities/{liability_id}", response_model=LiabilityResponse)
def update_liability(
    liability_id: int,
    liability: LiabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_liability = db.query(Liability).filter(Liability.id == liability_id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail="Liability not found")
    for key, value in liability.dict().items():
        setattr(db_liability, key, value)
    db.commit()
    db.refresh(db_liability)
    return db_liability

@router.delete("/liabilities/{liability_id}")
def delete_liability(
    liability_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_liability = db.query(Liability).filter(Liability.id == liability_id).first()
    if not db_liability:
        raise HTTPException(status_code=404, detail="Liability not found")
    db.delete(db_liability)
    db.commit()
    return {"message": "Liability deleted"}

