"""
Сервис для работы с API Wildberries
Документация: https://openapi.wildberries.ru/
"""
import requests
import json
from datetime import date, datetime, timedelta
from typing import List, Dict, Any
from decimal import Decimal

class WildberriesAPI:
    def __init__(self, api_key: str, stat_api_key: str = None):
        self.api_key = api_key
        self.stat_api_key = stat_api_key or api_key
        self.base_url = "https://statistics-api.wildberries.ru"
        self.headers = {
            "Authorization": api_key,
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, params: Dict = None) -> Dict:
        """Выполнить запрос к API Wildberries"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "POST":
                response = requests.post(url, headers=self.headers, json=params, timeout=30)
            else:
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ошибка запроса к Wildberries API: {str(e)}")
    
    def get_sales(self, from_date: date, to_date: date) -> List[Dict]:
        """
        Получить данные о продажах за период
        Использует метод /api/v1/supplier/sales
        """
        try:
            # WB API требует даты в формате RFC3339
            from_rfc = from_date.isoformat() + "T00:00:00Z"
            to_rfc = to_date.isoformat() + "T23:59:59Z"
            
            params = {
                "dateFrom": from_rfc,
                "dateTo": to_rfc
            }
            
            result = self._make_request("GET", "/api/v1/supplier/sales", params)
            
            # Группируем продажи по датам
            sales_by_date = {}
            for sale in result:
                sale_date = datetime.fromisoformat(sale["saleDate"].replace("Z", "+00:00")).date()
                if sale_date not in sales_by_date:
                    sales_by_date[sale_date] = {
                        "date": sale_date,
                        "revenue": 0.0,
                        "quantity": 0,
                        "orders": []
                    }
                
                # Цена продажи с учетом комиссии
                price = float(sale.get("priceWithDisc", sale.get("totalPrice", 0)))
                sales_by_date[sale_date]["revenue"] += price
                sales_by_date[sale_date]["quantity"] += sale.get("quantity", 1)
                sales_by_date[sale_date]["orders"].append(sale.get("srid", ""))
            
            # Преобразуем в список
            sales = []
            for date_key, data in sales_by_date.items():
                sales.append({
                    "date": data["date"],
                    "revenue": data["revenue"],
                    "quantity": data["quantity"],
                    "order_id": ", ".join(data["orders"][:5]),  # Первые 5 заказов
                    "description": f"Продажи за {date_key.isoformat()}"
                })
            
            return sales
        except Exception as e:
            raise Exception(f"Не удалось получить данные о продажах: {str(e)}")
    
    def get_orders(self, from_date: date, to_date: date) -> List[Dict]:
        """
        Получить данные о заказах за период
        Использует метод /api/v1/supplier/orders
        """
        try:
            from_rfc = from_date.isoformat() + "T00:00:00Z"
            to_rfc = to_date.isoformat() + "T23:59:59Z"
            
            params = {
                "dateFrom": from_rfc,
                "dateTo": to_rfc
            }
            
            result = self._make_request("GET", "/api/v1/supplier/orders", params)
            
            # Группируем заказы по датам
            orders_by_date = {}
            for order in result:
                order_date = datetime.fromisoformat(order["date"].replace("Z", "+00:00")).date()
                if order_date not in orders_by_date:
                    orders_by_date[order_date] = {
                        "date": order_date,
                        "revenue": 0.0,
                        "quantity": 0,
                        "orders": []
                    }
                
                price = float(order.get("totalPrice", 0))
                orders_by_date[order_date]["revenue"] += price
                orders_by_date[order_date]["quantity"] += order.get("quantity", 1)
                orders_by_date[order_date]["orders"].append(order.get("srid", ""))
            
            orders = []
            for date_key, data in orders_by_date.items():
                orders.append({
                    "date": data["date"],
                    "revenue": data["revenue"],
                    "quantity": data["quantity"],
                    "order_id": ", ".join(data["orders"][:5]),
                    "description": f"Заказы за {date_key.isoformat()}"
                })
            
            return orders
        except Exception as e:
            raise Exception(f"Не удалось получить данные о заказах: {str(e)}")
    
    def test_connection(self) -> bool:
        """Проверить подключение к API"""
        try:
            # Простой запрос для проверки
            today = date.today()
            week_ago = today - timedelta(days=7)
            result = self._make_request("GET", "/api/v1/supplier/orders", {
                "dateFrom": week_ago.isoformat() + "T00:00:00Z",
                "dateTo": today.isoformat() + "T23:59:59Z"
            })
            return True
        except Exception as e:
            print(f"Ошибка проверки подключения Wildberries: {str(e)}")
            return False

