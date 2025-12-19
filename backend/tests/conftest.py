import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Устанавливаем тестовую БД до импорта app
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Тестовая база данных в памяти
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Импортируем после настройки окружения
from app.database import Base, get_db, settings
from app.models.user import User
from app.auth.security import get_password_hash

# Переопределяем engine в settings для тестов
settings.database_url = SQLALCHEMY_DATABASE_URL
from app.database import engine as app_engine
# Заменяем engine в app.database
import app.database
app.database.engine = engine
app.database.SessionLocal = TestingSessionLocal

# Теперь импортируем app
from app.main import app

@pytest.fixture(scope="function")
def db():
    """Создает тестовую БД для каждого теста"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    """Создает тестового клиента"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db):
    """Создает тестового пользователя"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpass123")
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture(scope="function")
def auth_headers(client, test_user):
    """Получает токен авторизации для тестового пользователя"""
    response = client.post(
        "/api/auth/login",
        data={"username": "testuser", "password": "testpass123"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

