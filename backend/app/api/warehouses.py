from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.reference import Company
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from app.auth.security import get_current_user
from app.auth.permissions import filter_by_user_companies, can_write

router = APIRouter()

@router.get("/", response_model=List[WarehouseResponse])
def get_warehouses(
    company_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список складов"""
    query = db.query(Warehouse).filter(Warehouse.is_active == True)
    
    # Фильтр по организации
    if company_id:
        query = query.filter(Warehouse.company_id == company_id)
        # Проверка доступа к организации
        from app.auth.permissions import get_user_companies
        if current_user.role.value != "ADMIN":
            user_companies = get_user_companies(current_user.id, db)
            if company_id not in user_companies:
                raise HTTPException(status_code=403, detail="No access to this company")
    else:
        # Фильтрация по доступным организациям пользователя
        query = filter_by_user_companies(query, current_user, Warehouse.company_id, db)
    
    warehouses = query.offset(skip).limit(limit).all()
    return warehouses

@router.post("/", response_model=WarehouseResponse)
def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать склад"""
    # Проверка доступа к организации
    if not can_write(current_user, warehouse.company_id, db):
        raise HTTPException(status_code=403, detail="No write access to this company")
    
    # Проверка существования организации
    company = db.query(Company).filter(Company.id == warehouse.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db_warehouse = Warehouse(**warehouse.dict())
    db.add(db_warehouse)
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: int,
    warehouse: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить склад"""
    db_warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Проверка доступа
    if not can_write(current_user, db_warehouse.company_id, db):
        raise HTTPException(status_code=403, detail="No write access to this company")
    
    update_data = warehouse.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_warehouse, field, value)
    
    db.commit()
    db.refresh(db_warehouse)
    return db_warehouse

@router.delete("/{warehouse_id}")
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить склад (мягкое удаление)"""
    db_warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    # Проверка доступа
    if not can_write(current_user, db_warehouse.company_id, db):
        raise HTTPException(status_code=403, detail="No write access to this company")
    
    db_warehouse.is_active = False
    db.commit()
    return {"message": "Warehouse deleted"}

