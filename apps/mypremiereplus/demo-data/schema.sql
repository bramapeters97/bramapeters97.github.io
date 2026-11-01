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


-- Physical domain tables; records becomes a compatibility view, not duplicate storage.

PRAGMA foreign_keys=ON;

BEGIN IMMEDIATE;

ALTER TABLE records RENAME TO legacy_records_v1;

CREATE UNIQUE INDEX IF NOT EXISTS assets_tenant_id ON assets(tenant_id,id);

CREATE TABLE IF NOT EXISTS demo_fixture(id TEXT PRIMARY KEY,kind TEXT NOT NULL);

CREATE TABLE profiles(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 name TEXT GENERATED ALWAYS AS(json_extract(data,'$.name')) VIRTUAL,
 avatar TEXT GENERATED ALWAYS AS(json_extract(data,'$.avatar')) VIRTUAL,
 color TEXT GENERATED ALWAYS AS(json_extract(data,'$.color')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX profiles_tenant_active ON profiles(tenant_id,deleted_at,created_at);

INSERT INTO profiles(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='profiles';

CREATE TABLE collections(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 priority INTEGER GENERATED ALWAYS AS(json_extract(data,'$.priority')) VIRTUAL,
 visibility TEXT GENERATED ALWAYS AS(json_extract(data,'$.visibility')) VIRTUAL,
 gathering INTEGER GENERATED ALWAYS AS(json_extract(data,'$.gathering')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX collections_tenant_active ON collections(tenant_id,deleted_at,created_at);

INSERT INTO collections(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='collections';

CREATE TABLE provider_configs(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 provider TEXT GENERATED ALWAYS AS(json_extract(data,'$.provider')) VIRTUAL,
 configured INTEGER GENERATED ALWAYS AS(json_extract(data,'$.configured')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX provider_configs_tenant_active ON provider_configs(tenant_id,deleted_at,created_at);

INSERT INTO provider_configs(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='providerConfigs';

CREATE TABLE media_assets(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 provider TEXT GENERATED ALWAYS AS(json_extract(data,'$.provider')) VIRTUAL,
 provider_video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.providerVideoId')) VIRTUAL,
 kind TEXT GENERATED ALWAYS AS(json_extract(data,'$.kind')) VIRTUAL,
 duration REAL GENERATED ALWAYS AS(json_extract(data,'$.duration')) VIRTUAL,
 protected INTEGER GENERATED ALWAYS AS(json_extract(data,'$.protected')) VIRTUAL,
 demo INTEGER GENERATED ALWAYS AS(json_extract(data,'$.demo')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX media_assets_tenant_active ON media_assets(tenant_id,deleted_at,created_at);

INSERT INTO media_assets(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='mediaAssets';

CREATE TABLE playback_licenses(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 media_asset_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.mediaAssetId')) VIRTUAL,
 account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.accountId')) VIRTUAL,
 configured INTEGER GENERATED ALWAYS AS(json_extract(data,'$.configured')) VIRTUAL,
 requires_signing INTEGER GENERATED ALWAYS AS(json_extract(data,'$.requiresSigning')) VIRTUAL,
 expires_at TEXT GENERATED ALWAYS AS(json_extract(data,'$.expiresAt')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,media_asset_id) REFERENCES media_assets(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE INDEX playback_licenses_tenant_active ON playback_licenses(tenant_id,deleted_at,created_at);

INSERT INTO playback_licenses(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='playbackLicenses';

CREATE TABLE access_policies(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 scope TEXT GENERATED ALWAYS AS(json_extract(data,'$.scope')) VIRTUAL,
 visibility TEXT GENERATED ALWAYS AS(json_extract(data,'$.visibility')) VIRTUAL,
 configured INTEGER GENERATED ALWAYS AS(json_extract(data,'$.configured')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX access_policies_tenant_active ON access_policies(tenant_id,deleted_at,created_at);

INSERT INTO access_policies(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='accessPolicies';

CREATE TABLE consents(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.accountId')) VIRTUAL,
 kind TEXT GENERATED ALWAYS AS(json_extract(data,'$.kind')) VIRTUAL,
 granted INTEGER GENERATED ALWAYS AS(json_extract(data,'$.granted')) VIRTUAL,
 provider TEXT GENERATED ALWAYS AS(json_extract(data,'$.provider')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE INDEX consents_tenant_active ON consents(tenant_id,deleted_at,created_at);

INSERT INTO consents(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='consents';

CREATE TABLE videos(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 recording_year INTEGER GENERATED ALWAYS AS(json_extract(data,'$.year')) VIRTUAL,
 recorded_date TEXT GENERATED ALWAYS AS(json_extract(data,'$.recordedDate')) VIRTUAL,
 date_precision TEXT GENERATED ALWAYS AS(json_extract(data,'$.datePrecision')) VIRTUAL,
 duration REAL GENERATED ALWAYS AS(json_extract(data,'$.duration')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 location TEXT GENERATED ALWAYS AS(json_extract(data,'$.location')) VIRTUAL,
 occasion TEXT GENERATED ALWAYS AS(json_extract(data,'$.occasion')) VIRTUAL,
 featured INTEGER GENERATED ALWAYS AS(json_extract(data,'$.featured')) VIRTUAL,
 visibility TEXT GENERATED ALWAYS AS(json_extract(data,'$.visibility')) VIRTUAL,
 gathering INTEGER GENERATED ALWAYS AS(json_extract(data,'$.gathering')) VIRTUAL,
 family_tv INTEGER GENERATED ALWAYS AS(json_extract(data,'$.familyTv')) VIRTUAL,
 media_asset_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.mediaAssetId')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,media_asset_id) REFERENCES media_assets(tenant_id,id),
 CHECK(status IS NULL OR status IN ('draft','processing','ready','published','failed','unavailable'))
);

CREATE INDEX videos_tenant_active ON videos(tenant_id,deleted_at,created_at);

INSERT INTO videos(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='videos';

CREATE TABLE moments(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 start_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.start')) VIRTUAL,
 end_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.end')) VIRTUAL,
 approved INTEGER GENERATED ALWAYS AS(json_extract(data,'$.approved')) VIRTUAL,
 family_tv INTEGER GENERATED ALWAYS AS(json_extract(data,'$.familyTv')) VIRTUAL,
 creator_account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.creator')) VIRTUAL,
 visibility TEXT GENERATED ALWAYS AS(json_extract(data,'$.visibility')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(creator_account_id) REFERENCES accounts(id),
 UNIQUE(tenant_id,id,video_id),
 CHECK(start_seconds IS NULL OR (start_seconds>=0 AND end_seconds>start_seconds))
);

CREATE INDEX moments_tenant_active ON moments(tenant_id,deleted_at,created_at);

INSERT INTO moments(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='moments';

CREATE TABLE stories(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 body TEXT GENERATED ALWAYS AS(json_extract(data,'$.text')) VIRTUAL,
 timestamp_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.timestamp')) VIRTUAL,
 audio_asset_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.audioAssetId')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 creator_account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.creator')) VIRTUAL,
 visibility TEXT GENERATED ALWAYS AS(json_extract(data,'$.visibility')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,audio_asset_id) REFERENCES assets(tenant_id,id),
 FOREIGN KEY(creator_account_id) REFERENCES accounts(id)
);

CREATE INDEX stories_tenant_active ON stories(tenant_id,deleted_at,created_at);

INSERT INTO stories(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='stories';

CREATE TABLE transcripts(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 start_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.start')) VIRTUAL,
 end_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.end')) VIRTUAL,
 body TEXT GENERATED ALWAYS AS(json_extract(data,'$.text')) VIRTUAL,
 language TEXT GENERATED ALWAYS AS(json_extract(data,'$.language')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,
 CHECK(start_seconds IS NULL OR (start_seconds>=0 AND end_seconds>start_seconds))
);

CREATE INDEX transcripts_tenant_active ON transcripts(tenant_id,deleted_at,created_at);

INSERT INTO transcripts(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='transcripts';

CREATE TABLE chapters(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 start_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.start')) VIRTUAL,
 end_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.end')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX chapters_tenant_active ON chapters(tenant_id,deleted_at,created_at);

INSERT INTO chapters(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='chapters';

CREATE TABLE channels(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 name TEXT GENERATED ALWAYS AS(json_extract(data,'$.name')) VIRTUAL,
 mode TEXT GENERATED ALWAYS AS(json_extract(data,'$.mode')) VIRTUAL,
 enabled INTEGER GENERATED ALWAYS AS(json_extract(data,'$.enabled')) VIRTUAL,
 published INTEGER GENERATED ALWAYS AS(json_extract(data,'$.published')) VIRTUAL,
 min_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.minSeconds')) VIRTUAL,
 max_seconds REAL GENERATED ALWAYS AS(json_extract(data,'$.maxSeconds')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX channels_tenant_active ON channels(tenant_id,deleted_at,created_at);

INSERT INTO channels(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='channels';

CREATE TABLE programmes(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 host_account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.hostId')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 current_index INTEGER GENERATED ALWAYS AS(json_extract(data,'$.index')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(host_account_id) REFERENCES accounts(id)
);

CREATE INDEX programmes_tenant_active ON programmes(tenant_id,deleted_at,created_at);

INSERT INTO programmes(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='programmes';

CREATE TABLE premieres(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 release_at TEXT GENERATED ALWAYS AS(json_extract(data,'$.releaseAt')) VIRTUAL,
 timezone TEXT GENERATED ALWAYS AS(json_extract(data,'$.timezone')) VIRTUAL,
 published INTEGER GENERATED ALWAYS AS(json_extract(data,'$.published')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX premieres_tenant_active ON premieres(tenant_id,deleted_at,created_at);

INSERT INTO premieres(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='premieres';

CREATE TABLE contributions(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 asset_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.assetId')) VIRTUAL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 contributor_name TEXT GENERATED ALWAYS AS(json_extract(data,'$.contributorName')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,asset_id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX contributions_tenant_active ON contributions(tenant_id,deleted_at,created_at);

INSERT INTO contributions(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='contributions';

CREATE TABLE contribution_links(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 event_name TEXT GENERATED ALWAYS AS(json_extract(data,'$.eventName')) VIRTUAL,
 expires_at TEXT GENERATED ALWAYS AS(json_extract(data,'$.expiresAt')) VIRTUAL,
 enabled INTEGER GENERATED ALWAYS AS(json_extract(data,'$.enabled')) VIRTUAL,
 max_uploads INTEGER GENERATED ALWAYS AS(json_extract(data,'$.maxUploads')) VIRTUAL,
 max_bytes INTEGER GENERATED ALWAYS AS(json_extract(data,'$.maxBytes')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX contribution_links_tenant_active ON contribution_links(tenant_id,deleted_at,created_at);

INSERT INTO contribution_links(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='links';

CREATE TABLE uploads(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 filename TEXT GENERATED ALWAYS AS(json_extract(data,'$.filename')) VIRTUAL,
 video_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.videoId')) VIRTUAL,
 asset_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.assetId')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 provider TEXT GENERATED ALWAYS AS(json_extract(data,'$.provider')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,asset_id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX uploads_tenant_active ON uploads(tenant_id,deleted_at,created_at);

INSERT INTO uploads(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='uploads';

CREATE TABLE notifications(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 title TEXT GENERATED ALWAYS AS(json_extract(data,'$.title')) VIRTUAL,
 is_read INTEGER GENERATED ALWAYS AS(json_extract(data,'$.read')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX notifications_tenant_active ON notifications(tenant_id,deleted_at,created_at);

INSERT INTO notifications(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='notifications';

CREATE TABLE exports(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 kind TEXT GENERATED ALWAYS AS(json_extract(data,'$.kind')) VIRTUAL,
 filename TEXT GENERATED ALWAYS AS(json_extract(data,'$.filename')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX exports_tenant_active ON exports(tenant_id,deleted_at,created_at);

INSERT INTO exports(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='exports';

CREATE TABLE billing(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 plan_name TEXT GENERATED ALWAYS AS(json_extract(data,'$.planName')) VIRTUAL,
 currency TEXT GENERATED ALWAYS AS(json_extract(data,'$.currency')) VIRTUAL,
 monthly_price REAL GENERATED ALWAYS AS(json_extract(data,'$.monthlyPrice')) VIRTUAL,
 cadence TEXT GENERATED ALWAYS AS(json_extract(data,'$.cadence')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 billing_name TEXT GENERATED ALWAYS AS(json_extract(data,'$.billingName')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX billing_tenant_active ON billing(tenant_id,deleted_at,created_at);

INSERT INTO billing(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='billing';

CREATE TABLE invoices(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 invoice_number TEXT GENERATED ALWAYS AS(json_extract(data,'$.number')) VIRTUAL,
 invoice_date TEXT GENERATED ALWAYS AS(json_extract(data,'$.date')) VIRTUAL,
 total REAL GENERATED ALWAYS AS(json_extract(data,'$.total')) VIRTUAL,
 currency TEXT GENERATED ALWAYS AS(json_extract(data,'$.currency')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX invoices_tenant_active ON invoices(tenant_id,deleted_at,created_at);

INSERT INTO invoices(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='invoices';

CREATE TABLE history(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 actor_account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.actor')) VIRTUAL,
 action TEXT GENERATED ALWAYS AS(json_extract(data,'$.action')) VIRTUAL,
 resource_name TEXT GENERATED ALWAYS AS(json_extract(data,'$.resource')) VIRTUAL,
 record_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.recordId')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(actor_account_id) REFERENCES accounts(id)
);

CREATE INDEX history_tenant_active ON history(tenant_id,deleted_at,created_at);

INSERT INTO history(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='history';

CREATE TABLE queues(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.accountId')) VIRTUAL,
 channel_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.channelId')) VIRTUAL,
 mode TEXT GENERATED ALWAYS AS(json_extract(data,'$.mode')) VIRTUAL,
 status TEXT GENERATED ALWAYS AS(json_extract(data,'$.status')) VIRTUAL,
 current_index INTEGER GENERATED ALWAYS AS(json_extract(data,'$.index')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(account_id) REFERENCES accounts(id),
 FOREIGN KEY(tenant_id,channel_id) REFERENCES channels(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX queues_tenant_active ON queues(tenant_id,deleted_at,created_at);

INSERT INTO queues(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='queues';

CREATE TABLE settings(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 notifications_enabled INTEGER GENERATED ALWAYS AS(json_extract(data,'$.notifications')) VIRTUAL,
 recovery_days INTEGER GENERATED ALWAYS AS(json_extract(data,'$.recoveryDays')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX settings_tenant_active ON settings(tenant_id,deleted_at,created_at);

INSERT INTO settings(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='settings';

CREATE TABLE watchlists(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.accountId')) VIRTUAL,
 profile_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.profileId')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(account_id) REFERENCES accounts(id),
 FOREIGN KEY(tenant_id,profile_id) REFERENCES profiles(tenant_id,id) ON DELETE CASCADE,
 UNIQUE(tenant_id,account_id,profile_id)
);

CREATE INDEX watchlists_tenant_active ON watchlists(tenant_id,deleted_at,created_at);

INSERT INTO watchlists(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='watchlists';

CREATE TABLE asset_ownership(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 account_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.accountId')) VIRTUAL,
 attached INTEGER GENERATED ALWAYS AS(json_extract(data,'$.attached')) VIRTUAL,
 story_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.storyId')) VIRTUAL,
 PRIMARY KEY(tenant_id,id),
 FOREIGN KEY(account_id) REFERENCES accounts(id),
 FOREIGN KEY(tenant_id,id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE
);

CREATE INDEX asset_ownership_tenant_active ON asset_ownership(tenant_id,deleted_at,created_at);

INSERT INTO asset_ownership(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='assetOwnership';

CREATE TABLE recovery_records(
 id TEXT NOT NULL,
 tenant_id TEXT NOT NULL REFERENCES tenants(id),
 data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),
 deleted_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 source_resource TEXT GENERATED ALWAYS AS(json_extract(data,'$.sourceResource')) VIRTUAL,
 record_id TEXT GENERATED ALWAYS AS(json_extract(data,'$.recordId')) VIRTUAL,
 original_deleted_at TEXT GENERATED ALWAYS AS(json_extract(data,'$.deletedAt')) VIRTUAL,
 PRIMARY KEY(tenant_id,id)
);

CREATE INDEX recovery_records_tenant_active ON recovery_records(tenant_id,deleted_at,created_at);

INSERT INTO recovery_records(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource='recovery';

CREATE TABLE other_records(id TEXT NOT NULL,tenant_id TEXT NOT NULL REFERENCES tenants(id),resource TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(tenant_id,resource,id));

INSERT INTO other_records SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource NOT IN ('profiles','collections','providerConfigs','mediaAssets','playbackLicenses','accessPolicies','consents','videos','moments','stories','transcripts','chapters','channels','programmes','premieres','contributions','links','uploads','notifications','exports','billing','invoices','history','queues','settings','watchlists','assetOwnership','recovery');

CREATE VIEW records AS
 SELECT id,tenant_id,'profiles' AS resource,data,deleted_at,created_at,updated_at FROM profiles
 UNION ALL
 SELECT id,tenant_id,'collections' AS resource,data,deleted_at,created_at,updated_at FROM collections
 UNION ALL
 SELECT id,tenant_id,'providerConfigs' AS resource,data,deleted_at,created_at,updated_at FROM provider_configs
 UNION ALL
 SELECT id,tenant_id,'mediaAssets' AS resource,data,deleted_at,created_at,updated_at FROM media_assets
 UNION ALL
 SELECT id,tenant_id,'playbackLicenses' AS resource,data,deleted_at,created_at,updated_at FROM playback_licenses
 UNION ALL
 SELECT id,tenant_id,'accessPolicies' AS resource,data,deleted_at,created_at,updated_at FROM access_policies
 UNION ALL
 SELECT id,tenant_id,'consents' AS resource,data,deleted_at,created_at,updated_at FROM consents
 UNION ALL
 SELECT id,tenant_id,'videos' AS resource,data,deleted_at,created_at,updated_at FROM videos
 UNION ALL
 SELECT id,tenant_id,'moments' AS resource,data,deleted_at,created_at,updated_at FROM moments
 UNION ALL
 SELECT id,tenant_id,'stories' AS resource,data,deleted_at,created_at,updated_at FROM stories
 UNION ALL
 SELECT id,tenant_id,'transcripts' AS resource,data,deleted_at,created_at,updated_at FROM transcripts
 UNION ALL
 SELECT id,tenant_id,'chapters' AS resource,data,deleted_at,created_at,updated_at FROM chapters
 UNION ALL
 SELECT id,tenant_id,'channels' AS resource,data,deleted_at,created_at,updated_at FROM channels
 UNION ALL
 SELECT id,tenant_id,'programmes' AS resource,data,deleted_at,created_at,updated_at FROM programmes
 UNION ALL
 SELECT id,tenant_id,'premieres' AS resource,data,deleted_at,created_at,updated_at FROM premieres
 UNION ALL
 SELECT id,tenant_id,'contributions' AS resource,data,deleted_at,created_at,updated_at FROM contributions
 UNION ALL
 SELECT id,tenant_id,'links' AS resource,data,deleted_at,created_at,updated_at FROM contribution_links
 UNION ALL
 SELECT id,tenant_id,'uploads' AS resource,data,deleted_at,created_at,updated_at FROM uploads
 UNION ALL
 SELECT id,tenant_id,'notifications' AS resource,data,deleted_at,created_at,updated_at FROM notifications
 UNION ALL
 SELECT id,tenant_id,'exports' AS resource,data,deleted_at,created_at,updated_at FROM exports
 UNION ALL
 SELECT id,tenant_id,'billing' AS resource,data,deleted_at,created_at,updated_at FROM billing
 UNION ALL
 SELECT id,tenant_id,'invoices' AS resource,data,deleted_at,created_at,updated_at FROM invoices
 UNION ALL
 SELECT id,tenant_id,'history' AS resource,data,deleted_at,created_at,updated_at FROM history
 UNION ALL
 SELECT id,tenant_id,'queues' AS resource,data,deleted_at,created_at,updated_at FROM queues
 UNION ALL
 SELECT id,tenant_id,'settings' AS resource,data,deleted_at,created_at,updated_at FROM settings
 UNION ALL
 SELECT id,tenant_id,'watchlists' AS resource,data,deleted_at,created_at,updated_at FROM watchlists
 UNION ALL
 SELECT id,tenant_id,'assetOwnership' AS resource,data,deleted_at,created_at,updated_at FROM asset_ownership
 UNION ALL
 SELECT id,tenant_id,'recovery' AS resource,data,deleted_at,created_at,updated_at FROM recovery_records
 UNION ALL SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM other_records;

CREATE TRIGGER records_insert INSTEAD OF INSERT ON records BEGIN
 INSERT INTO profiles(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='profiles' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO collections(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='collections' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO provider_configs(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='providerConfigs' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO media_assets(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='mediaAssets' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO playback_licenses(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='playbackLicenses' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO access_policies(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='accessPolicies' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO consents(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='consents' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO videos(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='videos' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO moments(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='moments' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO stories(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='stories' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO transcripts(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='transcripts' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO chapters(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='chapters' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO channels(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='channels' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO programmes(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='programmes' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO premieres(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='premieres' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO contributions(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='contributions' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO contribution_links(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='links' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO uploads(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='uploads' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO notifications(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='notifications' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO exports(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='exports' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO billing(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='billing' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO invoices(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='invoices' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO history(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='history' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO queues(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='queues' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO settings(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='settings' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO watchlists(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='watchlists' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO asset_ownership(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='assetOwnership' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO recovery_records(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource='recovery' ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
 INSERT INTO other_records(id,tenant_id,resource,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.resource,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource NOT IN ('profiles','collections','providerConfigs','mediaAssets','playbackLicenses','accessPolicies','consents','videos','moments','stories','transcripts','chapters','channels','programmes','premieres','contributions','links','uploads','notifications','exports','billing','invoices','history','queues','settings','watchlists','assetOwnership','recovery') ON CONFLICT(tenant_id,resource,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;
END;

CREATE TRIGGER records_update INSTEAD OF UPDATE ON records BEGIN
 SELECT CASE WHEN NEW.resource<>OLD.resource THEN RAISE(ABORT,'A record resource cannot be changed') END;
 UPDATE profiles SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='profiles' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE collections SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='collections' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE provider_configs SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='providerConfigs' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE media_assets SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='mediaAssets' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE playback_licenses SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='playbackLicenses' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE access_policies SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='accessPolicies' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE consents SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='consents' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE videos SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='videos' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE moments SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='moments' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE stories SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='stories' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE transcripts SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='transcripts' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE chapters SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='chapters' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE channels SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='channels' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE programmes SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='programmes' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE premieres SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='premieres' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE contributions SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='contributions' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE contribution_links SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='links' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE uploads SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='uploads' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE notifications SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='notifications' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE exports SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='exports' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE billing SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='billing' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE invoices SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='invoices' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE history SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='history' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE queues SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='queues' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE settings SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='settings' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE watchlists SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='watchlists' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE asset_ownership SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='assetOwnership' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE recovery_records SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource='recovery' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 UPDATE other_records SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE resource=OLD.resource AND tenant_id=OLD.tenant_id AND id=OLD.id;
END;

CREATE TRIGGER records_delete INSTEAD OF DELETE ON records BEGIN
 DELETE FROM profiles WHERE OLD.resource='profiles' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM collections WHERE OLD.resource='collections' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM provider_configs WHERE OLD.resource='providerConfigs' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM media_assets WHERE OLD.resource='mediaAssets' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM playback_licenses WHERE OLD.resource='playbackLicenses' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM access_policies WHERE OLD.resource='accessPolicies' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM consents WHERE OLD.resource='consents' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM videos WHERE OLD.resource='videos' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM moments WHERE OLD.resource='moments' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM stories WHERE OLD.resource='stories' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM transcripts WHERE OLD.resource='transcripts' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM chapters WHERE OLD.resource='chapters' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM channels WHERE OLD.resource='channels' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM programmes WHERE OLD.resource='programmes' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM premieres WHERE OLD.resource='premieres' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM contributions WHERE OLD.resource='contributions' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM contribution_links WHERE OLD.resource='links' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM uploads WHERE OLD.resource='uploads' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM notifications WHERE OLD.resource='notifications' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM exports WHERE OLD.resource='exports' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM billing WHERE OLD.resource='billing' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM invoices WHERE OLD.resource='invoices' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM history WHERE OLD.resource='history' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM queues WHERE OLD.resource='queues' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM settings WHERE OLD.resource='settings' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM watchlists WHERE OLD.resource='watchlists' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM asset_ownership WHERE OLD.resource='assetOwnership' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM recovery_records WHERE OLD.resource='recovery' AND tenant_id=OLD.tenant_id AND id=OLD.id;
 DELETE FROM other_records WHERE resource=OLD.resource AND tenant_id=OLD.tenant_id AND id=OLD.id;
END;

CREATE TABLE video_collections(tenant_id TEXT NOT NULL,video_id TEXT NOT NULL,collection_id TEXT NOT NULL,PRIMARY KEY(tenant_id,video_id,collection_id),FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,collection_id) REFERENCES collections(tenant_id,id) ON DELETE CASCADE);

CREATE TABLE channel_collections(tenant_id TEXT NOT NULL,channel_id TEXT NOT NULL,collection_id TEXT NOT NULL,PRIMARY KEY(tenant_id,channel_id,collection_id),FOREIGN KEY(tenant_id,channel_id) REFERENCES channels(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,collection_id) REFERENCES collections(tenant_id,id) ON DELETE CASCADE);

CREATE TABLE programme_items(tenant_id TEXT NOT NULL,programme_id TEXT NOT NULL,position INTEGER NOT NULL,video_id TEXT NOT NULL,moment_id TEXT,PRIMARY KEY(tenant_id,programme_id,position),FOREIGN KEY(tenant_id,programme_id) REFERENCES programmes(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,moment_id,video_id) REFERENCES moments(tenant_id,id,video_id) ON DELETE CASCADE);

CREATE TABLE programme_profiles(tenant_id TEXT NOT NULL,programme_id TEXT NOT NULL,profile_id TEXT NOT NULL,PRIMARY KEY(tenant_id,programme_id,profile_id),FOREIGN KEY(tenant_id,programme_id) REFERENCES programmes(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,profile_id) REFERENCES profiles(tenant_id,id) ON DELETE CASCADE);

CREATE TABLE watchlist_items(tenant_id TEXT NOT NULL,watchlist_id TEXT NOT NULL,video_id TEXT NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(tenant_id,watchlist_id,video_id),FOREIGN KEY(tenant_id,watchlist_id) REFERENCES watchlists(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE);

INSERT OR IGNORE INTO video_collections(tenant_id,video_id,collection_id) SELECT p.tenant_id,p.id,j.value FROM videos p,json_each(p.data,'$.collectionIds') j JOIN collections c ON c.tenant_id=p.tenant_id AND c.id=j.value;

CREATE TRIGGER videos_video_collections_insert AFTER INSERT ON videos BEGIN DELETE FROM video_collections WHERE tenant_id=NEW.tenant_id AND video_id=NEW.id; INSERT OR IGNORE INTO video_collections(tenant_id,video_id,collection_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.collectionIds'); END;

CREATE TRIGGER videos_video_collections_update AFTER UPDATE OF data ON videos BEGIN DELETE FROM video_collections WHERE tenant_id=NEW.tenant_id AND video_id=NEW.id; INSERT OR IGNORE INTO video_collections(tenant_id,video_id,collection_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.collectionIds'); END;

INSERT OR IGNORE INTO channel_collections(tenant_id,channel_id,collection_id) SELECT p.tenant_id,p.id,j.value FROM channels p,json_each(p.data,'$.collectionIds') j JOIN collections c ON c.tenant_id=p.tenant_id AND c.id=j.value;

CREATE TRIGGER channels_channel_collections_insert AFTER INSERT ON channels BEGIN DELETE FROM channel_collections WHERE tenant_id=NEW.tenant_id AND channel_id=NEW.id; INSERT OR IGNORE INTO channel_collections(tenant_id,channel_id,collection_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.collectionIds'); END;

CREATE TRIGGER channels_channel_collections_update AFTER UPDATE OF data ON channels BEGIN DELETE FROM channel_collections WHERE tenant_id=NEW.tenant_id AND channel_id=NEW.id; INSERT OR IGNORE INTO channel_collections(tenant_id,channel_id,collection_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.collectionIds'); END;

INSERT OR IGNORE INTO programme_profiles(tenant_id,programme_id,profile_id) SELECT p.tenant_id,p.id,j.value FROM programmes p,json_each(p.data,'$.profileIds') j JOIN profiles c ON c.tenant_id=p.tenant_id AND c.id=j.value;

CREATE TRIGGER programmes_programme_profiles_insert AFTER INSERT ON programmes BEGIN DELETE FROM programme_profiles WHERE tenant_id=NEW.tenant_id AND programme_id=NEW.id; INSERT OR IGNORE INTO programme_profiles(tenant_id,programme_id,profile_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.profileIds'); END;

CREATE TRIGGER programmes_programme_profiles_update AFTER UPDATE OF data ON programmes BEGIN DELETE FROM programme_profiles WHERE tenant_id=NEW.tenant_id AND programme_id=NEW.id; INSERT OR IGNORE INTO programme_profiles(tenant_id,programme_id,profile_id) SELECT NEW.tenant_id,NEW.id,value FROM json_each(NEW.data,'$.profileIds'); END;

INSERT OR IGNORE INTO watchlist_items(tenant_id,watchlist_id,video_id,position) SELECT p.tenant_id,p.id,j.value,CAST(j.key AS INTEGER) FROM watchlists p,json_each(p.data,'$.videos') j JOIN videos c ON c.tenant_id=p.tenant_id AND c.id=j.value;

CREATE TRIGGER watchlists_watchlist_items_insert AFTER INSERT ON watchlists BEGIN DELETE FROM watchlist_items WHERE tenant_id=NEW.tenant_id AND watchlist_id=NEW.id; INSERT OR IGNORE INTO watchlist_items(tenant_id,watchlist_id,video_id,position) SELECT NEW.tenant_id,NEW.id,value,CAST(key AS INTEGER) FROM json_each(NEW.data,'$.videos'); END;

CREATE TRIGGER watchlists_watchlist_items_update AFTER UPDATE OF data ON watchlists BEGIN DELETE FROM watchlist_items WHERE tenant_id=NEW.tenant_id AND watchlist_id=NEW.id; INSERT OR IGNORE INTO watchlist_items(tenant_id,watchlist_id,video_id,position) SELECT NEW.tenant_id,NEW.id,value,CAST(key AS INTEGER) FROM json_each(NEW.data,'$.videos'); END;

INSERT INTO programme_items(tenant_id,programme_id,position,video_id,moment_id) SELECT p.tenant_id,p.id,CAST(j.key AS INTEGER),COALESCE(json_extract(j.value,'$.videoId'),m.video_id),m.id FROM programmes p,json_each(p.data,'$.queue') j LEFT JOIN moments m ON m.tenant_id=p.tenant_id AND m.id=json_extract(j.value,'$.momentId') JOIN videos v ON v.tenant_id=p.tenant_id AND v.id=COALESCE(json_extract(j.value,'$.videoId'),m.video_id) WHERE m.id IS NULL OR m.video_id=v.id;

CREATE TRIGGER programmes_items_insert AFTER INSERT ON programmes BEGIN DELETE FROM programme_items WHERE tenant_id=NEW.tenant_id AND programme_id=NEW.id; INSERT INTO programme_items(tenant_id,programme_id,position,video_id,moment_id) SELECT NEW.tenant_id,NEW.id,CAST(j.key AS INTEGER),COALESCE(json_extract(j.value,'$.videoId'),(SELECT video_id FROM moments WHERE tenant_id=NEW.tenant_id AND id=json_extract(j.value,'$.momentId'))),json_extract(j.value,'$.momentId') FROM json_each(NEW.data,'$.queue') j; END;

CREATE TRIGGER programmes_items_update AFTER UPDATE OF data ON programmes BEGIN DELETE FROM programme_items WHERE tenant_id=NEW.tenant_id AND programme_id=NEW.id; INSERT INTO programme_items(tenant_id,programme_id,position,video_id,moment_id) SELECT NEW.tenant_id,NEW.id,CAST(j.key AS INTEGER),COALESCE(json_extract(j.value,'$.videoId'),(SELECT video_id FROM moments WHERE tenant_id=NEW.tenant_id AND id=json_extract(j.value,'$.momentId'))),json_extract(j.value,'$.momentId') FROM json_each(NEW.data,'$.queue') j; END;

CREATE TRIGGER profiles_recoverable AFTER UPDATE OF deleted_at ON profiles WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('profiles:'||NEW.id,NEW.tenant_id,json_object('id','profiles:'||NEW.id,'sourceResource','profiles','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER profiles_restored AFTER UPDATE OF deleted_at ON profiles WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='profiles:'||NEW.id; END;

CREATE TRIGGER profiles_recovery_cleanup AFTER DELETE ON profiles BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='profiles:'||OLD.id; END;

CREATE TRIGGER collections_recoverable AFTER UPDATE OF deleted_at ON collections WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('collections:'||NEW.id,NEW.tenant_id,json_object('id','collections:'||NEW.id,'sourceResource','collections','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER collections_restored AFTER UPDATE OF deleted_at ON collections WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='collections:'||NEW.id; END;

CREATE TRIGGER collections_recovery_cleanup AFTER DELETE ON collections BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='collections:'||OLD.id; END;

CREATE TRIGGER provider_configs_recoverable AFTER UPDATE OF deleted_at ON provider_configs WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('providerConfigs:'||NEW.id,NEW.tenant_id,json_object('id','providerConfigs:'||NEW.id,'sourceResource','providerConfigs','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER provider_configs_restored AFTER UPDATE OF deleted_at ON provider_configs WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='providerConfigs:'||NEW.id; END;

CREATE TRIGGER provider_configs_recovery_cleanup AFTER DELETE ON provider_configs BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='providerConfigs:'||OLD.id; END;

CREATE TRIGGER media_assets_recoverable AFTER UPDATE OF deleted_at ON media_assets WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('mediaAssets:'||NEW.id,NEW.tenant_id,json_object('id','mediaAssets:'||NEW.id,'sourceResource','mediaAssets','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER media_assets_restored AFTER UPDATE OF deleted_at ON media_assets WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='mediaAssets:'||NEW.id; END;

CREATE TRIGGER media_assets_recovery_cleanup AFTER DELETE ON media_assets BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='mediaAssets:'||OLD.id; END;

CREATE TRIGGER playback_licenses_recoverable AFTER UPDATE OF deleted_at ON playback_licenses WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('playbackLicenses:'||NEW.id,NEW.tenant_id,json_object('id','playbackLicenses:'||NEW.id,'sourceResource','playbackLicenses','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER playback_licenses_restored AFTER UPDATE OF deleted_at ON playback_licenses WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='playbackLicenses:'||NEW.id; END;

CREATE TRIGGER playback_licenses_recovery_cleanup AFTER DELETE ON playback_licenses BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='playbackLicenses:'||OLD.id; END;

CREATE TRIGGER access_policies_recoverable AFTER UPDATE OF deleted_at ON access_policies WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('accessPolicies:'||NEW.id,NEW.tenant_id,json_object('id','accessPolicies:'||NEW.id,'sourceResource','accessPolicies','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER access_policies_restored AFTER UPDATE OF deleted_at ON access_policies WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='accessPolicies:'||NEW.id; END;

CREATE TRIGGER access_policies_recovery_cleanup AFTER DELETE ON access_policies BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='accessPolicies:'||OLD.id; END;

CREATE TRIGGER consents_recoverable AFTER UPDATE OF deleted_at ON consents WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('consents:'||NEW.id,NEW.tenant_id,json_object('id','consents:'||NEW.id,'sourceResource','consents','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER consents_restored AFTER UPDATE OF deleted_at ON consents WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='consents:'||NEW.id; END;

CREATE TRIGGER consents_recovery_cleanup AFTER DELETE ON consents BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='consents:'||OLD.id; END;

CREATE TRIGGER videos_recoverable AFTER UPDATE OF deleted_at ON videos WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('videos:'||NEW.id,NEW.tenant_id,json_object('id','videos:'||NEW.id,'sourceResource','videos','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER videos_restored AFTER UPDATE OF deleted_at ON videos WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='videos:'||NEW.id; END;

CREATE TRIGGER videos_recovery_cleanup AFTER DELETE ON videos BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='videos:'||OLD.id; END;

CREATE TRIGGER moments_recoverable AFTER UPDATE OF deleted_at ON moments WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('moments:'||NEW.id,NEW.tenant_id,json_object('id','moments:'||NEW.id,'sourceResource','moments','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER moments_restored AFTER UPDATE OF deleted_at ON moments WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='moments:'||NEW.id; END;

CREATE TRIGGER moments_recovery_cleanup AFTER DELETE ON moments BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='moments:'||OLD.id; END;

CREATE TRIGGER stories_recoverable AFTER UPDATE OF deleted_at ON stories WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('stories:'||NEW.id,NEW.tenant_id,json_object('id','stories:'||NEW.id,'sourceResource','stories','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER stories_restored AFTER UPDATE OF deleted_at ON stories WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='stories:'||NEW.id; END;

CREATE TRIGGER stories_recovery_cleanup AFTER DELETE ON stories BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='stories:'||OLD.id; END;

CREATE TRIGGER transcripts_recoverable AFTER UPDATE OF deleted_at ON transcripts WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('transcripts:'||NEW.id,NEW.tenant_id,json_object('id','transcripts:'||NEW.id,'sourceResource','transcripts','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER transcripts_restored AFTER UPDATE OF deleted_at ON transcripts WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='transcripts:'||NEW.id; END;

CREATE TRIGGER transcripts_recovery_cleanup AFTER DELETE ON transcripts BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='transcripts:'||OLD.id; END;

CREATE TRIGGER chapters_recoverable AFTER UPDATE OF deleted_at ON chapters WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('chapters:'||NEW.id,NEW.tenant_id,json_object('id','chapters:'||NEW.id,'sourceResource','chapters','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER chapters_restored AFTER UPDATE OF deleted_at ON chapters WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='chapters:'||NEW.id; END;

CREATE TRIGGER chapters_recovery_cleanup AFTER DELETE ON chapters BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='chapters:'||OLD.id; END;

CREATE TRIGGER channels_recoverable AFTER UPDATE OF deleted_at ON channels WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('channels:'||NEW.id,NEW.tenant_id,json_object('id','channels:'||NEW.id,'sourceResource','channels','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER channels_restored AFTER UPDATE OF deleted_at ON channels WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='channels:'||NEW.id; END;

CREATE TRIGGER channels_recovery_cleanup AFTER DELETE ON channels BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='channels:'||OLD.id; END;

CREATE TRIGGER programmes_recoverable AFTER UPDATE OF deleted_at ON programmes WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('programmes:'||NEW.id,NEW.tenant_id,json_object('id','programmes:'||NEW.id,'sourceResource','programmes','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER programmes_restored AFTER UPDATE OF deleted_at ON programmes WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='programmes:'||NEW.id; END;

CREATE TRIGGER programmes_recovery_cleanup AFTER DELETE ON programmes BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='programmes:'||OLD.id; END;

CREATE TRIGGER premieres_recoverable AFTER UPDATE OF deleted_at ON premieres WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('premieres:'||NEW.id,NEW.tenant_id,json_object('id','premieres:'||NEW.id,'sourceResource','premieres','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER premieres_restored AFTER UPDATE OF deleted_at ON premieres WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='premieres:'||NEW.id; END;

CREATE TRIGGER premieres_recovery_cleanup AFTER DELETE ON premieres BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='premieres:'||OLD.id; END;

CREATE TRIGGER contributions_recoverable AFTER UPDATE OF deleted_at ON contributions WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('contributions:'||NEW.id,NEW.tenant_id,json_object('id','contributions:'||NEW.id,'sourceResource','contributions','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER contributions_restored AFTER UPDATE OF deleted_at ON contributions WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='contributions:'||NEW.id; END;

CREATE TRIGGER contributions_recovery_cleanup AFTER DELETE ON contributions BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='contributions:'||OLD.id; END;

CREATE TRIGGER contribution_links_recoverable AFTER UPDATE OF deleted_at ON contribution_links WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('links:'||NEW.id,NEW.tenant_id,json_object('id','links:'||NEW.id,'sourceResource','links','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER contribution_links_restored AFTER UPDATE OF deleted_at ON contribution_links WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='links:'||NEW.id; END;

CREATE TRIGGER contribution_links_recovery_cleanup AFTER DELETE ON contribution_links BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='links:'||OLD.id; END;

CREATE TRIGGER uploads_recoverable AFTER UPDATE OF deleted_at ON uploads WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('uploads:'||NEW.id,NEW.tenant_id,json_object('id','uploads:'||NEW.id,'sourceResource','uploads','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER uploads_restored AFTER UPDATE OF deleted_at ON uploads WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='uploads:'||NEW.id; END;

CREATE TRIGGER uploads_recovery_cleanup AFTER DELETE ON uploads BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='uploads:'||OLD.id; END;

CREATE TRIGGER notifications_recoverable AFTER UPDATE OF deleted_at ON notifications WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('notifications:'||NEW.id,NEW.tenant_id,json_object('id','notifications:'||NEW.id,'sourceResource','notifications','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER notifications_restored AFTER UPDATE OF deleted_at ON notifications WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='notifications:'||NEW.id; END;

CREATE TRIGGER notifications_recovery_cleanup AFTER DELETE ON notifications BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='notifications:'||OLD.id; END;

CREATE TRIGGER exports_recoverable AFTER UPDATE OF deleted_at ON exports WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('exports:'||NEW.id,NEW.tenant_id,json_object('id','exports:'||NEW.id,'sourceResource','exports','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER exports_restored AFTER UPDATE OF deleted_at ON exports WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='exports:'||NEW.id; END;

CREATE TRIGGER exports_recovery_cleanup AFTER DELETE ON exports BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='exports:'||OLD.id; END;

CREATE TRIGGER billing_recoverable AFTER UPDATE OF deleted_at ON billing WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('billing:'||NEW.id,NEW.tenant_id,json_object('id','billing:'||NEW.id,'sourceResource','billing','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER billing_restored AFTER UPDATE OF deleted_at ON billing WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='billing:'||NEW.id; END;

CREATE TRIGGER billing_recovery_cleanup AFTER DELETE ON billing BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='billing:'||OLD.id; END;

CREATE TRIGGER invoices_recoverable AFTER UPDATE OF deleted_at ON invoices WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('invoices:'||NEW.id,NEW.tenant_id,json_object('id','invoices:'||NEW.id,'sourceResource','invoices','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER invoices_restored AFTER UPDATE OF deleted_at ON invoices WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='invoices:'||NEW.id; END;

CREATE TRIGGER invoices_recovery_cleanup AFTER DELETE ON invoices BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='invoices:'||OLD.id; END;

CREATE TRIGGER history_recoverable AFTER UPDATE OF deleted_at ON history WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('history:'||NEW.id,NEW.tenant_id,json_object('id','history:'||NEW.id,'sourceResource','history','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER history_restored AFTER UPDATE OF deleted_at ON history WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='history:'||NEW.id; END;

CREATE TRIGGER history_recovery_cleanup AFTER DELETE ON history BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='history:'||OLD.id; END;

CREATE TRIGGER queues_recoverable AFTER UPDATE OF deleted_at ON queues WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('queues:'||NEW.id,NEW.tenant_id,json_object('id','queues:'||NEW.id,'sourceResource','queues','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER queues_restored AFTER UPDATE OF deleted_at ON queues WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='queues:'||NEW.id; END;

CREATE TRIGGER queues_recovery_cleanup AFTER DELETE ON queues BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='queues:'||OLD.id; END;

CREATE TRIGGER settings_recoverable AFTER UPDATE OF deleted_at ON settings WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('settings:'||NEW.id,NEW.tenant_id,json_object('id','settings:'||NEW.id,'sourceResource','settings','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER settings_restored AFTER UPDATE OF deleted_at ON settings WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='settings:'||NEW.id; END;

CREATE TRIGGER settings_recovery_cleanup AFTER DELETE ON settings BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='settings:'||OLD.id; END;

CREATE TRIGGER watchlists_recoverable AFTER UPDATE OF deleted_at ON watchlists WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('watchlists:'||NEW.id,NEW.tenant_id,json_object('id','watchlists:'||NEW.id,'sourceResource','watchlists','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER watchlists_restored AFTER UPDATE OF deleted_at ON watchlists WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='watchlists:'||NEW.id; END;

CREATE TRIGGER watchlists_recovery_cleanup AFTER DELETE ON watchlists BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='watchlists:'||OLD.id; END;

CREATE TRIGGER asset_ownership_recoverable AFTER UPDATE OF deleted_at ON asset_ownership WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES('assetOwnership:'||NEW.id,NEW.tenant_id,json_object('id','assetOwnership:'||NEW.id,'sourceResource','assetOwnership','recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;

CREATE TRIGGER asset_ownership_restored AFTER UPDATE OF deleted_at ON asset_ownership WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id='assetOwnership:'||NEW.id; END;

CREATE TRIGGER asset_ownership_recovery_cleanup AFTER DELETE ON asset_ownership BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id='assetOwnership:'||OLD.id; END;

INSERT OR IGNORE INTO recovery_records(id,tenant_id,data,created_at,updated_at) SELECT resource||':'||id,tenant_id,json_object('id',resource||':'||id,'sourceResource',resource,'recordId',id,'deletedAt',deleted_at),deleted_at,updated_at FROM records WHERE deleted_at IS NOT NULL AND resource<>'recovery';

CREATE TABLE devices(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,account_id TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,revoked_at TEXT,FOREIGN KEY(tenant_id,account_id) REFERENCES memberships(tenant_id,account_id) ON DELETE CASCADE);

CREATE TABLE device_codes(id TEXT PRIMARY KEY,device_code_hash TEXT UNIQUE,user_code_hash TEXT NOT NULL UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('device','phone')),device_name TEXT NOT NULL,tenant_id TEXT,account_id TEXT,status TEXT NOT NULL CHECK(status IN ('pending','approved','consumed')),expires_at INTEGER NOT NULL,last_poll_at INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,approved_at TEXT,consumed_at TEXT,FOREIGN KEY(tenant_id,account_id) REFERENCES memberships(tenant_id,account_id) ON DELETE CASCADE);

CREATE INDEX device_codes_expiry ON device_codes(expires_at);

CREATE INDEX devices_account ON devices(tenant_id,account_id,revoked_at);

ALTER TABLE sessions ADD COLUMN device_name TEXT;

ALTER TABLE sessions ADD COLUMN device_id TEXT REFERENCES devices(id) ON DELETE CASCADE;

CREATE TRIGGER memberships_revoke_sessions AFTER DELETE ON memberships BEGIN DELETE FROM sessions WHERE tenant_id=OLD.tenant_id AND account_id=OLD.account_id; END;

DROP TABLE legacy_records_v1;

INSERT INTO schema_migrations(version,applied_at) VALUES(2,strftime('%Y-%m-%dT%H:%M:%fZ','now'));

COMMIT;
