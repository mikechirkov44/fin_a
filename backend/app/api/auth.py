from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db, settings
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, Token
from app.auth.security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
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
        role=user.role if user.role else UserRole.VIEWER
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def _perform_login(username: str, password: str, db: Session):
    """Внутренняя функция для выполнения логина"""
    import traceback
    
    # Проверяем наличие username и password
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )
    
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    # Ищем пользователя в базе данных
    try:
        user = db.query(User).filter(User.username == username).first()
    except Exception as db_error:
        print(f"Database error in login: {str(db_error)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )
    
    # Проверяем существование пользователя
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Проверяем активность пользователя
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Проверяем пароль
    try:
        password_valid = verify_password(password, user.hashed_password)
    except Exception as pwd_error:
        print(f"Password verification error: {str(pwd_error)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying password"
        )
    
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем токен
    try:
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
    except Exception as token_error:
        print(f"Token creation error: {str(token_error)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating access token"
        )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Логин через OAuth2 форму (application/x-www-form-urlencoded)"""
    import traceback
    
    try:
        print(f"Login attempt for username: {form_data.username}")
        return _perform_login(form_data.username, form_data.password, db)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in login endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/login-json", response_model=Token)
def login_json(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Альтернативный endpoint для логина через JSON"""
    import traceback
    
    try:
        print(f"Login attempt (JSON) for username: {login_data.username}")
        return _perform_login(login_data.username, login_data.password, db)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in login_json endpoint: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Загружаем связанные компании
    from app.models.user_company import UserCompany
    user_companies = db.query(UserCompany).filter(
        UserCompany.user_id == current_user.id
    ).all()
    
    user_dict = {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "role": current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role),
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "companies": user_companies
    }
    return user_dict

