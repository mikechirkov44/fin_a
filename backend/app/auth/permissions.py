from typing import List, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.user_company import UserCompany
from app.models.reference import Company
from app.auth.security import get_current_user

def get_user_companies(user_id: int, db: Session) -> List[int]:
    """Получить список ID организаций, к которым у пользователя есть доступ"""
    user_companies = db.query(UserCompany.company_id).filter(
        UserCompany.user_id == user_id
    ).all()
    return [uc[0] for uc in user_companies]

def get_user_role_in_company(user_id: int, company_id: int, db: Session) -> Optional[str]:
    """Получить роль пользователя в конкретной организации"""
    user_company = db.query(UserCompany).filter(
        UserCompany.user_id == user_id,
        UserCompany.company_id == company_id
    ).first()
    if user_company:
        return user_company.role
    return None

def get_effective_role(user: User, company_id: Optional[int] = None, db: Session = None) -> str:
    """Получить эффективную роль пользователя (глобальная или в организации)"""
    # Администратор имеет полный доступ ко всем организациям
    if user.role == UserRole.ADMIN:
        return UserRole.ADMIN.value
    
    # Если указана организация, проверяем роль в ней
    if company_id and db:
        role_in_company = get_user_role_in_company(user.id, company_id, db)
        if role_in_company:
            return role_in_company
    
    # Иначе используем глобальную роль
    return user.role.value

def require_role(allowed_roles: List[UserRole]):
    """Декоратор для проверки роли пользователя"""
    def decorator(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        # Администратор имеет доступ ко всему
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        # Проверяем, есть ли у пользователя одна из разрешенных ролей
        role_values = [role.value for role in allowed_roles]
        if current_user.role.value not in role_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return decorator

def require_company_access(
    company_id: Optional[int] = None,
    allowed_roles: Optional[List[UserRole]] = None
):
    """Проверка доступа пользователя к организации"""
    def check_access(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Администратор имеет доступ ко всем организациям
        if current_user.role == UserRole.ADMIN:
            return current_user
        
        if company_id is None:
            return current_user
        
        # Проверяем доступ к организации
        user_company = db.query(UserCompany).filter(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == company_id
        ).first()
        
        if not user_company:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this company"
            )
        
        # Если указаны разрешенные роли, проверяем роль в организации
        if allowed_roles:
            role_values = [role.value for role in allowed_roles]
            if user_company.role not in role_values:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions for this company"
                )
        
        return current_user
    return check_access

def filter_by_user_companies(query, user: User, company_field, db: Session):
    """Фильтровать запрос по организациям пользователя"""
    # Администратор видит все
    if user.role == UserRole.ADMIN:
        return query
    
    # Получаем список доступных организаций
    company_ids = get_user_companies(user.id, db)
    if not company_ids:
        # Если у пользователя нет доступа ни к одной организации, возвращаем пустой результат
        return query.filter(False)
    
    return query.filter(company_field.in_(company_ids))

def can_read(user: User, company_id: Optional[int] = None, db: Session = None) -> bool:
    """Проверка права на чтение"""
    if user.role == UserRole.ADMIN:
        return True
    if company_id and db:
        role = get_user_role_in_company(user.id, company_id, db)
        return role is not None
    return True  # VIEWER может читать

def can_write(user: User, company_id: Optional[int] = None, db: Session = None) -> bool:
    """Проверка права на запись"""
    if user.role == UserRole.ADMIN:
        return True
    if company_id and db:
        role = get_user_role_in_company(user.id, company_id, db)
        return role in [UserRole.ACCOUNTANT.value, UserRole.MANAGER.value]
    return user.role in [UserRole.ACCOUNTANT, UserRole.MANAGER]

def can_delete(user: User, company_id: Optional[int] = None, db: Session = None) -> bool:
    """Проверка права на удаление"""
    if user.role == UserRole.ADMIN:
        return True
    if company_id and db:
        role = get_user_role_in_company(user.id, company_id, db)
        return role in [UserRole.ACCOUNTANT.value, UserRole.MANAGER.value]
    return user.role in [UserRole.ACCOUNTANT, UserRole.MANAGER]

