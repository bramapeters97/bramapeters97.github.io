PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tenants (
 id TEXT PRIMARY KEY,
 settings TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 name TEXT NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')),
 PRIMARY KEY(tenant_id,account_id)
);
CREATE TABLE IF NOT EXISTS sessions (
 id TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 expires_at INTEGER NOT NULL,
 gathering INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id,tenant_id);
CREATE TABLE IF NOT EXISTS records (
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 resource TEXT NOT NULL,
 data TEXT NOT NULL,
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,resource,id)
);
CREATE INDEX IF NOT EXISTS records_tenant_kind ON records(tenant_id,resource,deleted_at);
CREATE TABLE IF NOT EXISTS assets (
 id TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 filename TEXT NOT NULL,
 content_type TEXT NOT NULL,
 size INTEGER NOT NULL,
 path TEXT NOT NULL,
 purpose TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assets_tenant ON assets(tenant_id);
CREATE TABLE IF NOT EXISTS tokens (
 hash TEXT PRIMARY KEY,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 kind TEXT NOT NULL,
 data TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 uses INTEGER NOT NULL DEFAULT 0,
 disabled INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS tokens_tenant ON tokens(tenant_id,kind);
CREATE TABLE IF NOT EXISTS progress (
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 account_id TEXT NOT NULL REFERENCES accounts(id),
 profile_id TEXT NOT NULL,
 video_id TEXT NOT NULL,
 position REAL NOT NULL,
 duration REAL NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(tenant_id,account_id,profile_id,video_id)
);
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS demo_fixture (id TEXT PRIMARY KEY, kind TEXT NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES(1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
