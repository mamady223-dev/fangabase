BEGIN;

CREATE TABLE IF NOT EXISTS fangabase_aggregates (
    scope text PRIMARY KEY,
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fangabase_domain_events (
    id uuid PRIMARY KEY,
    aggregate_scope text NOT NULL REFERENCES fangabase_aggregates(scope) ON DELETE RESTRICT,
    owner_id uuid,
    operation text NOT NULL,
    provider text NOT NULL DEFAULT 'local',
    idempotency_key text,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (aggregate_scope, owner_id, operation, provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS fangabase_domain_events_owner_created_idx
    ON fangabase_domain_events (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fangabase_financial_proofs (
    id uuid PRIMARY KEY,
    aggregate_scope text NOT NULL REFERENCES fangabase_aggregates(scope) ON DELETE RESTRICT,
    owner_id uuid NOT NULL,
    kind text NOT NULL CHECK (kind IN ('CREDIT', 'DEBIT', 'RESERVE', 'RELEASE', 'COMPENSATION')),
    amount_minor bigint NOT NULL CHECK (amount_minor > 0),
    currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    reference text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (aggregate_scope, owner_id, reference, kind)
);

CREATE INDEX IF NOT EXISTS fangabase_financial_proofs_owner_idx
    ON fangabase_financial_proofs (owner_id, created_at, id);

CREATE TABLE IF NOT EXISTS fangabase_migration_log (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO fangabase_migration_log (version)
VALUES ('0001_backend_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
