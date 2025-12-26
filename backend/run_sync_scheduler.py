"""
Скрипт для запуска планировщика автоматической синхронизации
Использование: python run_sync_scheduler.py
"""
from app.services.sync_scheduler import run_scheduler

if __name__ == "__main__":
    print("=" * 50)
    print("Планировщик автоматической синхронизации маркетплейсов")
    print("=" * 50)
    print("Для остановки нажмите Ctrl+C")
    print()
    
    try:
        run_scheduler(interval_minutes=60)  # Проверка каждый час
    except KeyboardInterrupt:
        print("\n[INFO] Планировщик остановлен пользователем")

