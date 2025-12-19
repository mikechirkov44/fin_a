import pytest
from datetime import date, timedelta

@pytest.fixture
def setup_cash_flow_data(client, auth_headers):
    """Настраивает данные для тестов ОДДС"""
    # Создаем справочники
    income_item = client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы"},
        headers=auth_headers
    ).json()
    
    expense_item = client.post(
        "/api/reference/expense-items",
        json={"name": "Расходы", "description": "Расходы"},
        headers=auth_headers
    ).json()
    
    payment_place = client.post(
        "/api/reference/payment-places",
        json={"name": "Счет", "description": "Счет"},
        headers=auth_headers
    ).json()
    
    # Создаем движения денег
    today = date.today()
    client.post(
        "/api/input1/",
        json={
            "date": str(today),
            "amount": 10000.00,
            "movement_type": "income",
            "income_item_id": income_item["id"],
            "payment_place_id": payment_place["id"],
            "is_business": True
        },
        headers=auth_headers
    )
    
    client.post(
        "/api/input1/",
        json={
            "date": str(today - timedelta(days=10)),
            "amount": 5000.00,
            "movement_type": "expense",
            "expense_item_id": expense_item["id"],
            "payment_place_id": payment_place["id"],
            "is_business": True
        },
        headers=auth_headers
    )
    
    return {
        "start_date": str(today - timedelta(days=30)),
        "end_date": str(today)
    }

def test_get_cash_flow_report(client, auth_headers, setup_cash_flow_data):
    """Тест получения отчета ОДДС"""
    response = client.get(
        "/api/cash-flow/",
        params=setup_cash_flow_data,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "periods" in data
    assert "totals" in data
    assert "income" in data["totals"]
    assert "expense" in data["totals"]
    assert "net" in data["totals"]

def test_cash_flow_by_category_income(client, auth_headers, setup_cash_flow_data):
    """Тест получения поступлений по категориям"""
    response = client.get(
        "/api/cash-flow/by-category",
        params={**setup_cash_flow_data, "movement_type": "income"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert data["movement_type"] == "income"

def test_cash_flow_by_category_expense(client, auth_headers, setup_cash_flow_data):
    """Тест получения расходов по категориям"""
    response = client.get(
        "/api/cash-flow/by-category",
        params={**setup_cash_flow_data, "movement_type": "expense"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert data["movement_type"] == "expense"

