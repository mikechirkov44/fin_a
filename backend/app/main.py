from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.database import engine, Base
import traceback

# Импортируем все модули моделей ПЕРЕД созданием таблиц, чтобы SQLAlchemy мог правильно настроить отношения
# Это гарантирует, что все модели загружены и отношения настроены до создания таблиц
import app.models.user
import app.models.user_company
import app.models.reference
import app.models.input1
import app.models.input2
import app.models.realization
import app.models.shipment
import app.models.product
import app.models.marketplace_integration
import app.models.audit
import app.models.budget
import app.models.notification
import app.models.warehouse
import app.models.inventory
import app.models.inventory_transaction
import app.models.product_cost
import app.models.customer
import app.models.supplier
import app.models.recommendation

# Теперь импортируем конкретные классы для использования в коде
from app.models import (
    User, UserRole, UserCompany,
    IncomeGroup, IncomeItem, ExpenseGroup, ExpenseItem,
    PaymentPlace, Company, ExpenseCategory, SalesChannel,
    MoneyMovement, Asset, Liability,
    Realization, RealizationItem, Shipment, Product,
    MarketplaceIntegration, AuditLog, Budget, Notification,
    Warehouse, Inventory, InventoryTransaction, ProductCost,
    Customer, CustomerSegment, CustomerPurchase, CustomerInteraction,
    Supplier, SupplierOrder, SupplierOrderItem, SupplierContract
)

from app.api import auth, users, reference, input1, input2, balance, cash_flow, profit_loss, cash_flow_analysis, profit_loss_analysis, realization, shipment, products, dashboard, export, import_api, marketplace_integration, audit, budget, notification, warehouses, inventory, customers, suppliers, recommendations, bank_cash

# Явно настраиваем мапперы после импорта всех моделей
# Это гарантирует, что все отношения (back_populates) настроены правильно
from sqlalchemy.orm import configure_mappers
try:
    configure_mappers()
except Exception as e:
    # Если есть ошибки конфигурации, выводим их для отладки
    import traceback
    traceback.print_exc()
    raise

# Создаем таблицы (после импорта всех моделей и настройки мапперов)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Financial Reporting System", version="1.0.0")

# CORS настройки - ДОЛЖНО БЫТЬ ПЕРВЫМ middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Обработчик ошибок валидации
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Обработчик исключений для добавления CORS заголовков к ошибкам
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Подключение роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(reference.router, prefix="/api/reference", tags=["reference"])
app.include_router(input1.router, prefix="/api/input1", tags=["input1"])
app.include_router(bank_cash.router, prefix="/api/bank-cash", tags=["bank-cash"])
app.include_router(input2.router, prefix="/api/input2", tags=["input2"])
app.include_router(balance.router, prefix="/api/balance", tags=["balance"])
app.include_router(cash_flow.router, prefix="/api/cash-flow", tags=["cash-flow"])
app.include_router(profit_loss.router, prefix="/api/profit-loss", tags=["profit-loss"])
app.include_router(cash_flow_analysis.router, prefix="/api/cash-flow-analysis", tags=["cash-flow-analysis"])
app.include_router(profit_loss_analysis.router, prefix="/api/profit-loss-analysis", tags=["profit-loss-analysis"])
app.include_router(realization.router, prefix="/api/realization", tags=["realization"])
app.include_router(shipment.router, prefix="/api/shipment", tags=["shipment"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(warehouses.router, prefix="/api/warehouses", tags=["warehouses"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(import_api.router, prefix="/api/import", tags=["import"])
app.include_router(marketplace_integration.router, prefix="/api/marketplace-integration", tags=["marketplace-integration"])
app.include_router(budget.router, prefix="/api/budget", tags=["budget"])
app.include_router(audit.router, prefix="/api", tags=["audit"])
app.include_router(notification.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])

@app.get("/")
async def root():
    return {"message": "Financial Reporting System API"}

