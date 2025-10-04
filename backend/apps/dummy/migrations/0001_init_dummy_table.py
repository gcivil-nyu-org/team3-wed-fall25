# backend/apps/dummy/migrations/0001_init_dummy_table.py
from django.db import migrations

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS demo_item (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at_demo_item'
    ) THEN
        CREATE OR REPLACE FUNCTION set_updated_at_demo_item()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_demo_item'
    ) THEN
        CREATE TRIGGER trg_set_updated_at_demo_item
        BEFORE UPDATE ON demo_item
        FOR EACH ROW EXECUTE PROCEDURE set_updated_at_demo_item();
    END IF;
END$$;
"""

DROP_SQL = """
DROP TRIGGER IF EXISTS trg_set_updated_at_demo_item ON demo_item;
DROP FUNCTION IF EXISTS set_updated_at_demo_item();
DROP TABLE IF EXISTS demo_item;
"""

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.RunSQL(sql=CREATE_SQL, reverse_sql=DROP_SQL),
    ]
