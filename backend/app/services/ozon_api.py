"""
Сервис для работы с API OZON
Документация: https://docs.ozon.ru/api/seller/
"""
import requests
import json
from datetime import date, datetime, timedelta
from typing import List, Dict, Any
from decimal import Decimal

class OzonAPI:
    def __init__(self, client_id: str, api_key: str):
        self.client_id = client_id
        self.api_key = api_key
        self.base_url = "https://api-seller.ozon.ru"
        self.headers = {
            "Client-Id": client_id,
            "Api-Key": api_key,
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Выполнить запрос к API OZON"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            else:
                response = requests.get(url, headers=self.headers, params=data, timeout=30)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ошибка запроса к OZON API: {str(e)}")
    
    def get_sales(self, from_date: date, to_date: date, limit: int = 1000) -> List[Dict]:
        """
        Получить данные о продажах за период
        Использует метод /v3/finance/transaction/list
        """
        try:
            # OZON API требует даты в формате ISO 8601
            from_iso = from_date.isoformat() + "T00:00:00Z"
            to_iso = to_date.isoformat() + "T23:59:59Z"
            
            data = {
                "filter": {
                    "date": {
                        "from": from_iso,
                        "to": to_iso
                    },
                    "operation_type": ["operation_agent_delivery_to_customer", "operation_agent_delivery_return"]
                },
                "page": 1,
                "page_size": limit
            }
            
            result = self._make_request("POST", "/v3/finance/transaction/list", data)
            
            # Парсим транзакции и преобразуем в формат реализаций
            sales = []
            if "result" in result and "operations" in result["result"]:
                for operation in result["result"]["operations"]:
                    if operation.get("operation_type") == "operation_agent_delivery_to_customer":
                        # Это продажа
                        sales.append({
                            "date": datetime.fromisoformat(operation["date"].replace("Z", "+00:00")).date(),
                            "revenue": float(operation.get("accruals_for_sale", 0)),
                            "quantity": 1,  # OZON не возвращает количество в транзакциях
                            "order_id": operation.get("posting_number", ""),
                            "description": f"Заказ {operation.get('posting_number', '')}"
                        })
            
            return sales
        except Exception as e:
            # Если метод не работает, пробуем альтернативный через отчеты
            return self._get_sales_alternative(from_date, to_date)
    
    def _get_sales_alternative(self, from_date: date, to_date: date) -> List[Dict]:
        """
        Альтернативный метод получения продаж через отчеты
        Использует /v1/analytics/data
        """
        try:
            data = {
                "date_from": from_date.isoformat(),
                "date_to": to_date.isoformat(),
                "metrics": ["ordered_units", "revenue"]
            }
            
            result = self._make_request("POST", "/v1/analytics/data", data)
            
            sales = []
            if "result" in result and "data" in result["result"]:
                for item in result["result"]["data"]:
                    sales.append({
                        "date": datetime.fromisoformat(item["dimensions"]["date"]["id"]).date(),
                        "revenue": float(item.get("metrics", {}).get("revenue", 0)),
                        "quantity": int(item.get("metrics", {}).get("ordered_units", 0)),
                        "description": f"Продажи за {item['dimensions']['date']['id']}"
                    })
            
            return sales
        except Exception as e:
            raise Exception(f"Не удалось получить данные о продажах: {str(e)}")
    
    def test_connection(self) -> bool:
        """Проверить подключение к API"""
        try:
            # Простой запрос для проверки - используем метод получения информации о компании
            # Если метод недоступен, пробуем получить список транзакций за последний день
            from datetime import date, timedelta
            today = date.today()
            yesterday = today - timedelta(days=1)
            result = self.get_sales(yesterday, today, limit=1)
            return True
        except Exception as e:
            print(f"Ошибка проверки подключения OZON: {str(e)}")
            return False

