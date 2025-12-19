import pytest

def test_create_income_item(client, auth_headers):
    """Тест создания статьи дохода"""
    response = client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы от продаж"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Продажи"
    assert data["is_active"] == True

def test_get_income_items(client, auth_headers):
    """Тест получения списка статей дохода"""
    # Создаем статью
    client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы от продаж"},
        headers=auth_headers
    )
    
    response = client.get("/api/reference/income-items", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(item["name"] == "Продажи" for item in data)

def test_update_income_item(client, auth_headers):
    """Тест обновления статьи дохода"""
    # Создаем статью
    create_response = client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы от продаж"},
        headers=auth_headers
    )
    item_id = create_response.json()["id"]
    
    # Обновляем
    response = client.put(
        f"/api/reference/income-items/{item_id}",
        json={"name": "Продажи обновленные", "description": "Новое описание"},
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Продажи обновленные"

def test_delete_income_item(client, auth_headers):
    """Тест удаления статьи дохода"""
    # Создаем статью
    create_response = client.post(
        "/api/reference/income-items",
        json={"name": "Продажи", "description": "Доходы от продаж"},
        headers=auth_headers
    )
    item_id = create_response.json()["id"]
    
    # Удаляем
    response = client.delete(
        f"/api/reference/income-items/{item_id}",
        headers=auth_headers
    )
    assert response.status_code == 200

def test_create_expense_item(client, auth_headers):
    """Тест создания статьи расхода"""
    response = client.post(
        "/api/reference/expense-items",
        json={"name": "Зарплата", "description": "Расходы на зарплату"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Зарплата"

def test_create_payment_place(client, auth_headers):
    """Тест создания места оплаты"""
    response = client.post(
        "/api/reference/payment-places",
        json={"name": "Расчетный счет", "description": "Основной счет"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Расчетный счет"

