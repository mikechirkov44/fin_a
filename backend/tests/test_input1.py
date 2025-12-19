import pytest
from datetime import date, timedelta

@pytest.fixture
def income_item(client, auth_headers):
    """Создает статью дохода для тестов"""
    response = client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы от продаж"},
        headers=auth_headers
    )
    return response.json()

@pytest.fixture
def expense_item(client, auth_headers):
    """Создает статью расхода для тестов"""
    response = client.post(
        "/api/reference/expense-items",
        json={"name": "Зарплата", "description": "Расходы на зарплату"},
        headers=auth_headers
    )
    return response.json()

@pytest.fixture
def payment_place(client, auth_headers):
    """Создает место оплаты для тестов"""
    response = client.post(
        "/api/reference/payment-places",
        json={"name": "Расчетный счет", "description": "Основной счет"},
        headers=auth_headers
    )
    return response.json()

def test_create_income_movement(client, auth_headers, income_item, payment_place):
    """Тест создания поступления"""
    response = client.post(
        "/api/input1/",
        json={
            "date": str(date.today()),
            "amount": 10000.00,
            "movement_type": "income",
            "income_item_id": income_item["id"],
            "payment_place_id": payment_place["id"],
            "is_business": True,
            "description": "Тестовое поступление"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["amount"]) == 10000.00
    assert data["movement_type"] == "income"

def test_create_expense_movement(client, auth_headers, expense_item, payment_place):
    """Тест создания оплаты"""
    response = client.post(
        "/api/input1/",
        json={
            "date": str(date.today()),
            "amount": 5000.00,
            "movement_type": "expense",
            "expense_item_id": expense_item["id"],
            "payment_place_id": payment_place["id"],
            "is_business": True,
            "description": "Тестовая оплата"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert float(data["amount"]) == 5000.00
    assert data["movement_type"] == "expense"

def test_get_money_movements(client, auth_headers, income_item, payment_place):
    """Тест получения списка движений денег"""
    # Создаем движение
    client.post(
        "/api/input1/",
        json={
            "date": str(date.today()),
            "amount": 10000.00,
            "movement_type": "income",
            "income_item_id": income_item["id"],
            "payment_place_id": payment_place["id"],
            "is_business": True
        },
        headers=auth_headers
    )
    
    response = client.get("/api/input1/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_create_movement_validation_error(client, auth_headers, payment_place):
    """Тест валидации - доход без статьи дохода"""
    response = client.post(
        "/api/input1/",
        json={
            "date": str(date.today()),
            "amount": 10000.00,
            "movement_type": "income",
            "payment_place_id": payment_place["id"],
            "is_business": True
        },
        headers=auth_headers
    )
    assert response.status_code == 400

