from pydantic import BaseModel
from datetime import datetime

class MarketplaceIntegrationCreate(BaseModel):
    marketplace_name: str  # Название маркетплейса (OZON, Wildberries и т.д.)
    company_id: int
    ozon_client_id: str | None = None
    ozon_api_key: str | None = None
    wb_api_key: str | None = None
    wb_stat_api_key: str | None = None
    is_active: bool = True
    auto_sync: bool = False
    sync_interval_hours: int = 24

class MarketplaceIntegrationUpdate(BaseModel):
    ozon_client_id: str | None = None
    ozon_api_key: str | None = None
    wb_api_key: str | None = None
    wb_stat_api_key: str | None = None
    is_active: bool | None = None
    auto_sync: bool | None = None
    sync_interval_hours: int | None = None

class MarketplaceIntegrationResponse(BaseModel):
    id: int
    marketplace_name: str
    company_id: int
    ozon_client_id: str | None
    ozon_api_key: str | None  # Будем скрывать в реальном ответе
    wb_api_key: str | None
    wb_stat_api_key: str | None
    is_active: bool
    auto_sync: bool
    sync_interval_hours: int
    last_sync_at: datetime | None
    last_sync_status: str | None
    last_sync_error: str | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True

class SyncRequest(BaseModel):
    integration_id: int  # ID интеграции вместо marketplace_id
    company_id: int | None = None
    start_date: str | None = None  # ISO format date
    end_date: str | None = None  # ISO format date

class SyncResponse(BaseModel):
    success: bool
    message: str
    imported_count: int = 0
    errors: list[str] = []

