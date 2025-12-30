"""
Миграция для добавления таблиц поставщиков и клиентов
"""
from sqlalchemy import create_engine, text
from app.database import settings

def migrate():
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # Создаем таблицы поставщиков
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                company_id INTEGER NOT NULL REFERENCES companies(id),
                contact_person VARCHAR,
                phone VARCHAR,
                email VARCHAR,
                inn VARCHAR,
                kpp VARCHAR,
                ogrn VARCHAR,
                legal_address TEXT,
                actual_address TEXT,
                bank_name VARCHAR,
                bank_account VARCHAR,
                correspondent_account VARCHAR,
                bik VARCHAR,
                description TEXT,
                rating NUMERIC(3, 2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id)"))
        
        # Создаем таблицы заказов поставщиков
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS supplier_orders (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
                company_id INTEGER NOT NULL REFERENCES companies(id),
                order_number VARCHAR NOT NULL,
                order_date DATE NOT NULL,
                expected_delivery_date DATE,
                actual_delivery_date DATE,
                status VARCHAR DEFAULT 'pending',
                total_amount NUMERIC(12, 2) DEFAULT 0,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_supplier_orders_order_number ON supplier_orders(order_number)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier_id ON supplier_orders(supplier_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_supplier_orders_company_id ON supplier_orders(company_id)"))
        
        # Создаем таблицы позиций заказов
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS supplier_order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER NOT NULL REFERENCES supplier_orders(id),
                product_id INTEGER REFERENCES products(id),
                product_name VARCHAR NOT NULL,
                quantity NUMERIC(10, 2) NOT NULL,
                unit_price NUMERIC(10, 2) NOT NULL,
                total_price NUMERIC(12, 2) NOT NULL,
                description TEXT
            )
        """))
        
        # Создаем таблицы договоров с поставщиками
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS supplier_contracts (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
                company_id INTEGER NOT NULL REFERENCES companies(id),
                contract_number VARCHAR NOT NULL,
                contract_date DATE NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                contract_type VARCHAR DEFAULT 'supply',
                total_amount NUMERIC(12, 2),
                description TEXT,
                file_path VARCHAR,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_supplier_contracts_contract_number ON supplier_contracts(contract_number)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier_id ON supplier_contracts(supplier_id)"))
        
        # Создаем таблицы сегментов клиентов
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS customer_segments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id),
                name VARCHAR NOT NULL,
                description TEXT,
                color VARCHAR DEFAULT '#4a90e2',
                min_purchase_amount NUMERIC(12, 2),
                max_purchase_amount NUMERIC(12, 2),
                min_purchase_count INTEGER,
                max_purchase_count INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Создаем таблицы клиентов
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id),
                name VARCHAR NOT NULL,
                type VARCHAR DEFAULT 'individual',
                phone VARCHAR,
                email VARCHAR,
                address TEXT,
                inn VARCHAR,
                kpp VARCHAR,
                legal_name VARCHAR,
                segment_id INTEGER REFERENCES customer_segments(id),
                total_purchases NUMERIC(12, 2) DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                average_check NUMERIC(10, 2) DEFAULT 0,
                last_purchase_date DATE,
                ltv NUMERIC(12, 2) DEFAULT 0,
                recency INTEGER,
                frequency INTEGER,
                monetary NUMERIC(12, 2),
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id)"))
        
        # Создаем таблицы покупок клиентов
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS customer_purchases (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                realization_id INTEGER REFERENCES realizations(id),
                purchase_date DATE NOT NULL,
                amount NUMERIC(12, 2) NOT NULL,
                quantity INTEGER DEFAULT 0,
                sales_channel_id INTEGER REFERENCES sales_channels(id),
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customer_purchases_customer_id ON customer_purchases(customer_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customer_purchases_purchase_date ON customer_purchases(purchase_date)"))
        
        # Создаем таблицы взаимодействий с клиентами
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS customer_interactions (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                user_id INTEGER REFERENCES users(id),
                interaction_type VARCHAR NOT NULL,
                interaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                subject VARCHAR,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions(customer_id)"))
        
        conn.commit()
        print("✅ Миграция успешно выполнена!")
        print("Созданы таблицы:")
        print("  - suppliers, supplier_orders, supplier_order_items, supplier_contracts")
        print("  - customers, customer_segments, customer_purchases, customer_interactions")

if __name__ == "__main__":
    migrate()

