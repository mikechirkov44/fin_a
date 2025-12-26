from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.user_company import UserCompany
from app.models.reference import Company
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserCompanyCreate, UserCompanyResponse
from app.auth.security import get_current_user, get_password_hash
from app.auth.permissions import require_role, get_user_companies

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Получить список пользователей (только для администраторов)"""
    users = db.query(User).offset(skip).limit(limit).all()
    result = []
    for user in users:
        user_companies = db.query(UserCompany).filter(
            UserCompany.user_id == user.id
        ).all()
        result.append({
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
            "is_active": user.is_active,
            "created_at": user.created_at,
            "companies": user_companies
        })
    return result

@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Создать нового пользователя (только для администраторов)"""
    # Проверка существования пользователя
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Создание нового пользователя
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    user_companies = db.query(UserCompany).filter(
        UserCompany.user_id == db_user.id
    ).all()
    
    return {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "role": db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role),
        "is_active": db_user.is_active,
        "created_at": db_user.created_at,
        "companies": user_companies
    }

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Обновить пользователя (только для администраторов)"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.email:
        existing = db.query(User).filter(User.email == user_update.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        db_user.email = user_update.email
    
    if user_update.username:
        existing = db.query(User).filter(User.username == user_update.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already registered")
        db_user.username = user_update.username
    
    if user_update.role:
        db_user.role = user_update.role
    
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(db_user)
    
    user_companies = db.query(UserCompany).filter(
        UserCompany.user_id == db_user.id
    ).all()
    
    return {
        "id": db_user.id,
        "email": db_user.email,
        "username": db_user.username,
        "role": db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role),
        "is_active": db_user.is_active,
        "created_at": db_user.created_at,
        "companies": user_companies
    }

@router.post("/{user_id}/companies", response_model=UserCompanyResponse)
def add_user_to_company(
    user_id: int,
    user_company: UserCompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Добавить пользователя в организацию (только для администраторов)"""
    # Проверка существования пользователя и организации
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = db.query(Company).filter(Company.id == user_company.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Проверка на дубликат
    existing = db.query(UserCompany).filter(
        UserCompany.user_id == user_id,
        UserCompany.company_id == user_company.company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in this company")
    
    db_user_company = UserCompany(
        user_id=user_id,
        company_id=user_company.company_id,
        role=user_company.role.value if hasattr(user_company.role, 'value') else str(user_company.role)
    )
    db.add(db_user_company)
    db.commit()
    db.refresh(db_user_company)
    
    return {
        "id": db_user_company.id,
        "user_id": db_user_company.user_id,
        "company_id": db_user_company.company_id,
        "role": db_user_company.role,
        "created_at": db_user_company.created_at
    }

@router.delete("/{user_id}/companies/{company_id}")
def remove_user_from_company(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    """Удалить пользователя из организации (только для администраторов)"""
    user_company = db.query(UserCompany).filter(
        UserCompany.user_id == user_id,
        UserCompany.company_id == company_id
    ).first()
    if not user_company:
        raise HTTPException(status_code=404, detail="User-Company relationship not found")
    
    db.delete(user_company)
    db.commit()
    return {"message": "User removed from company"}

@router.get("/{user_id}/companies", response_model=List[UserCompanyResponse])
def get_user_companies_list(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список организаций пользователя"""
    # Пользователь может видеть свои организации, администратор - любые
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user_companies = db.query(UserCompany).filter(
        UserCompany.user_id == user_id
    ).all()
    
    return [
        {
            "id": uc.id,
            "user_id": uc.user_id,
            "company_id": uc.company_id,
            "role": uc.role,
            "created_at": uc.created_at
        }
        for uc in user_companies
    ]

