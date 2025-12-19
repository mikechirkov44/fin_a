import pytest
from datetime import date

@pytest.fixture
def asset(client, auth_headers):
    """Создает актив для тестов"""
    response = client.post(
        "/api/input2/assets",
        json={
            "name": "Оборотные средства",
            "category": "current",
            "value": 50000.00,
            "date": str(date.today()),
            "description": "Тестовый актив"
        },
        headers=auth_headers
    )
    return response.json()

@pytest.fixture
def liability(client, auth_headers):
    """Создает обязательство для тестов"""
    response = client.post(
        "/api/input2/liabilities",
        json={
            "name": "Кредит",
            "category": "short_term",
            "value": 20000.00,
            "date": str(date.today()),
            "description": "Тестовое обязательство"
        },
        headers=auth_headers
    )
    return response.json()

def test_get_balance(client, auth_headers, asset, liability):
    """Тест получения баланса"""
    response = client.get(
        f"/api/balance/?balance_date={date.today()}",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "assets" in data
    assert "liabilities" in data
    assert "equity" in data
    assert "cash_balance" in data
    assert data["assets"]["total"] >= 0
    assert data["liabilities"]["total"] >= 0

def test_balance_calculation(client, auth_headers, asset, liability):
    """Тест расчета баланса"""
    response = client.get(
        f"/api/balance/?balance_date={date.today()}",
        headers=auth_headers
    )
    data = response.json()
    
    # Проверяем, что капитал = активы - обязательства
    calculated_equity = data["assets"]["total"] - data["liabilities"]["total"]
    assert abs(data["equity"] - calculated_equity) < 0.01

