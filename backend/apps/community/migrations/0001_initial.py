# backend/apps/community/migrations/0001_community_tables.py

from django.db import migrations

COMMUNITY_SQL = """
-- =========================
-- community_favorites
-- =========================
CREATE TABLE IF NOT EXISTS community_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bbl TEXT NOT NULL,
    note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_favorites_bbl
    ON community_favorites (bbl);

CREATE INDEX IF NOT EXISTS idx_favorites_user
    ON community_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_createdat
    ON community_favorites (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_user_bbl_active
    ON community_favorites (user_id, bbl)
    WHERE deleted_at IS NULL;

-- =========================
-- community_reviews
-- =========================
CREATE TABLE IF NOT EXISTS community_reviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    bbl TEXT NOT NULL,
    rating NUMERIC(2, 1) NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_reviews_rating_valid
        CHECK (rating IS NULL OR (rating > 0 AND rating <= 5.0))
);

CREATE INDEX IF NOT EXISTS idx_reviews_bbl
    ON community_reviews (bbl);

CREATE INDEX IF NOT EXISTS idx_reviews_bbl_createdat
    ON community_reviews (bbl, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_bbl_rating_nonnull
    ON community_reviews (bbl, rating)
    WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_user
    ON community_reviews (user_id);

-- =========================
-- community_review_comments
-- =========================
CREATE TABLE IF NOT EXISTS community_review_comments (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_review
    ON community_review_comments (review_id);

CREATE INDEX IF NOT EXISTS idx_comments_review_created
    ON community_review_comments (review_id, created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user
    ON community_review_comments (user_id);

-- =========================
-- community_messages
-- =========================
CREATE TABLE IF NOT EXISTS community_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    bbl TEXT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_inbox_unread
    ON community_messages (receiver_id, read_at);

CREATE INDEX IF NOT EXISTS idx_messages_inbox_time
    ON community_messages (receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_outbox_time
    ON community_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_bbl
    ON community_messages (bbl);
"""

REVERSE_SQL = """
DROP TABLE IF EXISTS community_messages CASCADE;
DROP TABLE IF EXISTS community_review_comments CASCADE;
DROP TABLE IF EXISTS community_reviews CASCADE;
DROP TABLE IF EXISTS community_favorites CASCADE;
"""


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql=COMMUNITY_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
