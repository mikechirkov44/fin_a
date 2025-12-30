"""
Миграция для добавления таблицы виджетов дашборда
"""
from sqlalchemy import create_engine, text
from app.database import settings

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS dashboard_widgets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                company_id INTEGER REFERENCES companies(id),
                widget_type VARCHAR NOT NULL,
                widget_config JSONB,
                title VARCHAR,
                "order" INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_id ON dashboard_widgets(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_company_id ON dashboard_widgets(company_id)"))
        
        conn.commit()
        print("Migration dashboard_widgets completed successfully!")

if __name__ == "__main__":
    migrate()

