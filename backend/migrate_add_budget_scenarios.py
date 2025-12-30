"""
Миграция для добавления поддержки сценариев бюджетирования
"""
from sqlalchemy import create_engine, text
from app.database import settings

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # Создаем таблицу budget_scenarios
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS budget_scenarios (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id),
                name VARCHAR NOT NULL,
                description VARCHAR,
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        # Добавляем поля в таблицу budgets
        try:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS scenario_id INTEGER REFERENCES budget_scenarios(id)"))
        except Exception as e:
            print(f"Column scenario_id might already exist: {e}")
        
        try:
            conn.execute(text("ALTER TABLE budgets ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(15, 2)"))
        except Exception as e:
            print(f"Column actual_amount might already exist: {e}")
        
        # Создаем индексы
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_budget_scenarios_company_id ON budget_scenarios(company_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_budgets_scenario_id ON budgets(scenario_id)"))
        
        conn.commit()
        print("Migration budget_scenarios completed successfully!")

if __name__ == "__main__":
    migrate()

