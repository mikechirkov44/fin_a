-- Миграция: Переименование колонки marketplace_id в sales_channel_id
-- Выполнить после миграции данных из migrate_marketplace_to_sales_channel.py

-- 1. Удаляем внешние ключи
ALTER TABLE realizations DROP CONSTRAINT IF EXISTS realizations_marketplace_id_fkey;
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_marketplace_id_fkey;

-- 2. Переименовываем колонки
ALTER TABLE realizations RENAME COLUMN marketplace_id TO sales_channel_id;
ALTER TABLE shipments RENAME COLUMN marketplace_id TO sales_channel_id;

-- 3. Создаем новые внешние ключи
ALTER TABLE realizations 
ADD CONSTRAINT realizations_sales_channel_id_fkey 
FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id);

ALTER TABLE shipments 
ADD CONSTRAINT shipments_sales_channel_id_fkey 
FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id);

-- 4. Создаем индексы (если их еще нет)
CREATE INDEX IF NOT EXISTS idx_realizations_sales_channel_id ON realizations(sales_channel_id);
CREATE INDEX IF NOT EXISTS idx_shipments_sales_channel_id ON shipments(sales_channel_id);

-- 5. После проверки можно удалить таблицу marketplaces (выполнить вручную после проверки):
-- DROP TABLE IF EXISTS marketplaces CASCADE;

