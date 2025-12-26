"""
Сервис для автоматической синхронизации данных с маркетплейсами
Можно запускать как отдельный процесс или через планировщик задач
"""
import time
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.marketplace_integration import MarketplaceIntegration
from app.api.marketplace_integration import perform_sync

def check_and_sync_integrations():
    """Проверить все активные интеграции и запустить синхронизацию при необходимости"""
    db = SessionLocal()
    try:
        # Получаем все активные интеграции с автосинхронизацией
        integrations = db.query(MarketplaceIntegration).filter(
            MarketplaceIntegration.is_active == True,
            MarketplaceIntegration.auto_sync == True
        ).all()
        
        synced_count = 0
        for integration in integrations:
            # Проверяем, нужно ли синхронизировать
            should_sync = False
            
            if not integration.last_sync_at:
                # Никогда не синхронизировалось
                should_sync = True
            else:
                # Проверяем интервал
                next_sync_time = integration.last_sync_at + timedelta(hours=integration.sync_interval_hours)
                if datetime.now() >= next_sync_time:
                    should_sync = True
            
            # Не синхронизируем, если уже идет процесс
            if integration.last_sync_status == "in_progress":
                continue
            
            if should_sync:
                try:
                    # Определяем период синхронизации (последние 7 дней или с последней синхронизации)
                    if integration.last_sync_at:
                        start_date = integration.last_sync_at.date()
                    else:
                        start_date = datetime.now().date() - timedelta(days=7)
                    
                    end_date = datetime.now().date()
                    
                    print(f"[SYNC] Запуск синхронизации для {integration.marketplace_name} (ID: {integration.id})")
                    perform_sync(
                        integration.id,
                        integration.marketplace_name.lower(),
                        start_date,
                        end_date
                    )
                    synced_count += 1
                except Exception as e:
                    print(f"[ERROR] Ошибка синхронизации для интеграции {integration.id}: {str(e)}")
        
        if synced_count > 0:
            print(f"[SYNC] Синхронизировано интеграций: {synced_count}")
        else:
            print(f"[SYNC] Нет интеграций для синхронизации")
    
    finally:
        db.close()

def run_scheduler(interval_minutes: int = 60):
    """Запустить планировщик синхронизации (работает в бесконечном цикле)"""
    print(f"[SCHEDULER] Планировщик запущен. Интервал проверки: {interval_minutes} минут")
    
    while True:
        try:
            check_and_sync_integrations()
        except Exception as e:
            print(f"[ERROR] Критическая ошибка в планировщике: {str(e)}")
        
        # Ждем перед следующей проверкой
        time.sleep(interval_minutes * 60)

if __name__ == "__main__":
    # Запуск планировщика с интервалом 1 час
    run_scheduler(interval_minutes=60)

