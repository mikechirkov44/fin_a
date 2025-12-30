from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.budget_scenario import BudgetScenario
from app.schemas.budget_scenario import (
    BudgetScenarioCreate, BudgetScenarioUpdate, BudgetScenarioResponse
)
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[BudgetScenarioResponse])
def get_scenarios(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список сценариев бюджетирования"""
    query = db.query(BudgetScenario).filter(BudgetScenario.is_active == True)
    
    if company_id:
        query = query.filter(BudgetScenario.company_id == company_id)
    
    scenarios = query.order_by(BudgetScenario.is_default.desc(), BudgetScenario.name).all()
    return scenarios

@router.post("/", response_model=BudgetScenarioResponse)
def create_scenario(
    scenario: BudgetScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новый сценарий бюджетирования"""
    # Если это сценарий по умолчанию, снимаем флаг с других
    if scenario.is_default:
        db.query(BudgetScenario).filter(
            BudgetScenario.company_id == scenario.company_id,
            BudgetScenario.is_default == True
        ).update({"is_default": False})
    
    db_scenario = BudgetScenario(**scenario.dict())
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario

@router.put("/{scenario_id}", response_model=BudgetScenarioResponse)
def update_scenario(
    scenario_id: int,
    scenario_update: BudgetScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить сценарий бюджетирования"""
    scenario = db.query(BudgetScenario).filter(BudgetScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    update_data = scenario_update.dict(exclude_unset=True)
    
    # Если устанавливаем как default, снимаем флаг с других
    if update_data.get("is_default") == True:
        db.query(BudgetScenario).filter(
            BudgetScenario.company_id == scenario.company_id,
            BudgetScenario.id != scenario_id,
            BudgetScenario.is_default == True
        ).update({"is_default": False})
    
    for key, value in update_data.items():
        setattr(scenario, key, value)
    
    db.commit()
    db.refresh(scenario)
    return scenario

@router.delete("/{scenario_id}")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить сценарий бюджетирования"""
    scenario = db.query(BudgetScenario).filter(BudgetScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario.is_active = False
    db.commit()
    return {"message": "Scenario deleted"}

