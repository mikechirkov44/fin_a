"""
Миграция для добавления таблиц шаблонов отчетов и расписаний
"""
from sqlalchemy import create_engine, text
from app.database import settings

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # Создаем таблицу report_templates
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS report_templates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR NOT NULL,
                description TEXT,
                report_config JSONB NOT NULL,
                is_public BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Создаем таблицу report_schedules
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS report_schedules (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                report_template_id INTEGER NOT NULL REFERENCES report_templates(id),
                company_id INTEGER REFERENCES companies(id),
                name VARCHAR NOT NULL,
                frequency VARCHAR NOT NULL,
                day_of_week INTEGER,
                day_of_month INTEGER,
                month INTEGER,
                time_hour INTEGER DEFAULT 9,
                time_minute INTEGER DEFAULT 0,
                email_recipients JSONB,
                export_format VARCHAR DEFAULT 'pdf',
                is_active BOOLEAN DEFAULT TRUE,
                last_run_at TIMESTAMP WITH TIME ZONE,
                next_run_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Создаем индексы
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_templates_user_id ON report_templates(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_templates_company_id ON report_templates(company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_schedules_user_id ON report_schedules(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_schedules_template_id ON report_schedules(report_template_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at)"))
        
        conn.commit()
        print("Migration report_templates and report_schedules completed successfully!")

if __name__ == "__main__":
    migrate()

