// Authoring helper for the checked-in, portable SQLite/D1 migration.
import { writeFileSync } from "node:fs";
const rows = [
  [
    "profiles",
    "profiles",
    {
      name: ["TEXT", "name"],
      avatar: ["TEXT", "avatar"],
      color: ["TEXT", "color"],
    },
  ],
  [
    "collections",
    "collections",
    {
      title: ["TEXT", "title"],
      priority: ["INTEGER", "priority"],
      visibility: ["TEXT", "visibility"],
      gathering: ["INTEGER", "gathering"],
    },
  ],
  [
    "providerConfigs",
    "provider_configs",
    { provider: ["TEXT", "provider"], configured: ["INTEGER", "configured"] },
  ],
  [
    "mediaAssets",
    "media_assets",
    {
      provider: ["TEXT", "provider"],
      provider_video_id: ["TEXT", "providerVideoId"],
      kind: ["TEXT", "kind"],
      duration: ["REAL", "duration"],
      protected: ["INTEGER", "protected"],
      demo: ["INTEGER", "demo"],
    },
  ],
  [
    "playbackLicenses",
    "playback_licenses",
    {
      media_asset_id: ["TEXT", "mediaAssetId"],
      account_id: ["TEXT", "accountId"],
      configured: ["INTEGER", "configured"],
      requires_signing: ["INTEGER", "requiresSigning"],
      expires_at: ["TEXT", "expiresAt"],
    },
    [
      "FOREIGN KEY(tenant_id,media_asset_id) REFERENCES media_assets(tenant_id,id) ON DELETE CASCADE",
      "FOREIGN KEY(account_id) REFERENCES accounts(id)",
    ],
  ],
  [
    "accessPolicies",
    "access_policies",
    {
      scope: ["TEXT", "scope"],
      visibility: ["TEXT", "visibility"],
      configured: ["INTEGER", "configured"],
    },
  ],
  [
    "consents",
    "consents",
    {
      account_id: ["TEXT", "accountId"],
      kind: ["TEXT", "kind"],
      granted: ["INTEGER", "granted"],
      provider: ["TEXT", "provider"],
    },
    ["FOREIGN KEY(account_id) REFERENCES accounts(id)"],
  ],
  [
    "videos",
    "videos",
    {
      title: ["TEXT", "title"],
      recording_year: ["INTEGER", "year"],
      recorded_date: ["TEXT", "recordedDate"],
      date_precision: ["TEXT", "datePrecision"],
      duration: ["REAL", "duration"],
      status: ["TEXT", "status"],
      location: ["TEXT", "location"],
      occasion: ["TEXT", "occasion"],
      featured: ["INTEGER", "featured"],
      visibility: ["TEXT", "visibility"],
      gathering: ["INTEGER", "gathering"],
      family_tv: ["INTEGER", "familyTv"],
      media_asset_id: ["TEXT", "mediaAssetId"],
    },
    [
      "FOREIGN KEY(tenant_id,media_asset_id) REFERENCES media_assets(tenant_id,id)",
      "CHECK(status IS NULL OR status IN ('draft','processing','ready','published','failed','unavailable'))",
    ],
  ],
  [
    "moments",
    "moments",
    {
      title: ["TEXT", "title"],
      video_id: ["TEXT", "videoId"],
      start_seconds: ["REAL", "start"],
      end_seconds: ["REAL", "end"],
      approved: ["INTEGER", "approved"],
      family_tv: ["INTEGER", "familyTv"],
      creator_account_id: ["TEXT", "creator"],
      visibility: ["TEXT", "visibility"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
      "FOREIGN KEY(creator_account_id) REFERENCES accounts(id)",
      "UNIQUE(tenant_id,id,video_id)",
      "CHECK(start_seconds IS NULL OR (start_seconds>=0 AND end_seconds>start_seconds))",
    ],
  ],
  [
    "stories",
    "stories",
    {
      video_id: ["TEXT", "videoId"],
      body: ["TEXT", "text"],
      timestamp_seconds: ["REAL", "timestamp"],
      audio_asset_id: ["TEXT", "audioAssetId"],
      status: ["TEXT", "status"],
      creator_account_id: ["TEXT", "creator"],
      visibility: ["TEXT", "visibility"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
      "FOREIGN KEY(tenant_id,audio_asset_id) REFERENCES assets(tenant_id,id)",
      "FOREIGN KEY(creator_account_id) REFERENCES accounts(id)",
    ],
  ],
  [
    "transcripts",
    "transcripts",
    {
      video_id: ["TEXT", "videoId"],
      start_seconds: ["REAL", "start"],
      end_seconds: ["REAL", "end"],
      body: ["TEXT", "text"],
      language: ["TEXT", "language"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
      "CHECK(start_seconds IS NULL OR (start_seconds>=0 AND end_seconds>start_seconds))",
    ],
  ],
  [
    "chapters",
    "chapters",
    {
      title: ["TEXT", "title"],
      video_id: ["TEXT", "videoId"],
      start_seconds: ["REAL", "start"],
      end_seconds: ["REAL", "end"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "channels",
    "channels",
    {
      name: ["TEXT", "name"],
      mode: ["TEXT", "mode"],
      enabled: ["INTEGER", "enabled"],
      published: ["INTEGER", "published"],
      min_seconds: ["REAL", "minSeconds"],
      max_seconds: ["REAL", "maxSeconds"],
    },
  ],
  [
    "programmes",
    "programmes",
    {
      title: ["TEXT", "title"],
      host_account_id: ["TEXT", "hostId"],
      status: ["TEXT", "status"],
      current_index: ["INTEGER", "index"],
    },
    ["FOREIGN KEY(host_account_id) REFERENCES accounts(id)"],
  ],
  [
    "premieres",
    "premieres",
    {
      title: ["TEXT", "title"],
      video_id: ["TEXT", "videoId"],
      release_at: ["TEXT", "releaseAt"],
      timezone: ["TEXT", "timezone"],
      published: ["INTEGER", "published"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "contributions",
    "contributions",
    {
      title: ["TEXT", "title"],
      status: ["TEXT", "status"],
      asset_id: ["TEXT", "assetId"],
      video_id: ["TEXT", "videoId"],
      contributor_name: ["TEXT", "contributorName"],
    },
    [
      "FOREIGN KEY(tenant_id,asset_id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE",
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "links",
    "contribution_links",
    {
      event_name: ["TEXT", "eventName"],
      expires_at: ["TEXT", "expiresAt"],
      enabled: ["INTEGER", "enabled"],
      max_uploads: ["INTEGER", "maxUploads"],
      max_bytes: ["INTEGER", "maxBytes"],
    },
  ],
  [
    "uploads",
    "uploads",
    {
      filename: ["TEXT", "filename"],
      video_id: ["TEXT", "videoId"],
      asset_id: ["TEXT", "assetId"],
      status: ["TEXT", "status"],
      provider: ["TEXT", "provider"],
    },
    [
      "FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE",
      "FOREIGN KEY(tenant_id,asset_id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "notifications",
    "notifications",
    { title: ["TEXT", "title"], is_read: ["INTEGER", "read"] },
  ],
  [
    "exports",
    "exports",
    {
      status: ["TEXT", "status"],
      kind: ["TEXT", "kind"],
      filename: ["TEXT", "filename"],
    },
  ],
  [
    "billing",
    "billing",
    {
      plan_name: ["TEXT", "planName"],
      currency: ["TEXT", "currency"],
      monthly_price: ["REAL", "monthlyPrice"],
      cadence: ["TEXT", "cadence"],
      status: ["TEXT", "status"],
      billing_name: ["TEXT", "billingName"],
    },
  ],
  [
    "invoices",
    "invoices",
    {
      invoice_number: ["TEXT", "number"],
      invoice_date: ["TEXT", "date"],
      total: ["REAL", "total"],
      currency: ["TEXT", "currency"],
      status: ["TEXT", "status"],
    },
  ],
  [
    "history",
    "history",
    {
      actor_account_id: ["TEXT", "actor"],
      action: ["TEXT", "action"],
      resource_name: ["TEXT", "resource"],
      record_id: ["TEXT", "recordId"],
    },
    ["FOREIGN KEY(actor_account_id) REFERENCES accounts(id)"],
  ],
  [
    "queues",
    "queues",
    {
      account_id: ["TEXT", "accountId"],
      channel_id: ["TEXT", "channelId"],
      mode: ["TEXT", "mode"],
      status: ["TEXT", "status"],
      current_index: ["INTEGER", "index"],
    },
    [
      "FOREIGN KEY(account_id) REFERENCES accounts(id)",
      "FOREIGN KEY(tenant_id,channel_id) REFERENCES channels(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "settings",
    "settings",
    {
      notifications_enabled: ["INTEGER", "notifications"],
      recovery_days: ["INTEGER", "recoveryDays"],
    },
  ],
  [
    "watchlists",
    "watchlists",
    { account_id: ["TEXT", "accountId"], profile_id: ["TEXT", "profileId"] },
    [
      "FOREIGN KEY(account_id) REFERENCES accounts(id)",
      "FOREIGN KEY(tenant_id,profile_id) REFERENCES profiles(tenant_id,id) ON DELETE CASCADE",
      "UNIQUE(tenant_id,account_id,profile_id)",
    ],
  ],
  [
    "assetOwnership",
    "asset_ownership",
    {
      account_id: ["TEXT", "accountId"],
      attached: ["INTEGER", "attached"],
      story_id: ["TEXT", "storyId"],
    },
    [
      "FOREIGN KEY(account_id) REFERENCES accounts(id)",
      "FOREIGN KEY(tenant_id,id) REFERENCES assets(tenant_id,id) ON DELETE CASCADE",
    ],
  ],
  [
    "recovery",
    "recovery_records",
    {
      source_resource: ["TEXT", "sourceResource"],
      record_id: ["TEXT", "recordId"],
      original_deleted_at: ["TEXT", "deletedAt"],
    },
  ],
];
const q = (v) => `'${v.replaceAll("'", "''")}'`;
const sql = [
  "-- Physical domain tables; records becomes a compatibility view, not duplicate storage.",
  "PRAGMA foreign_keys=ON;",
  "BEGIN IMMEDIATE;",
  "ALTER TABLE records RENAME TO legacy_records_v1;",
  "CREATE UNIQUE INDEX IF NOT EXISTS assets_tenant_id ON assets(tenant_id,id);",
  "CREATE TABLE IF NOT EXISTS demo_fixture(id TEXT PRIMARY KEY,kind TEXT NOT NULL);",
];
for (const [resource, table, columns, constraints = []] of rows) {
  const generated = Object.entries(columns).map(
    ([name, [type, path]]) =>
      ` ${name} ${type} GENERATED ALWAYS AS(json_extract(data,${q("$." + path)})) VIRTUAL`,
  );
  sql.push(
    `CREATE TABLE ${table}(\n id TEXT NOT NULL,\n tenant_id TEXT NOT NULL REFERENCES tenants(id),\n data TEXT NOT NULL CHECK(json_valid(data) AND json_type(data)='object'),\n deleted_at TEXT,\n created_at TEXT NOT NULL,\n updated_at TEXT NOT NULL,\n${[...generated, " PRIMARY KEY(tenant_id,id)", ...constraints.map((c) => " " + c)].join(",\n")}\n);`,
  );
  sql.push(
    `CREATE INDEX ${table}_tenant_active ON ${table}(tenant_id,deleted_at,created_at);`,
  );
  sql.push(
    `INSERT INTO ${table}(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT id,tenant_id,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource=${q(resource)};`,
  );
}
sql.push(
  "CREATE TABLE other_records(id TEXT NOT NULL,tenant_id TEXT NOT NULL REFERENCES tenants(id),resource TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)),deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(tenant_id,resource,id));",
);
sql.push(
  `INSERT INTO other_records SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM legacy_records_v1 WHERE resource NOT IN (${rows.map((r) => q(r[0])).join(",")});`,
);
sql.push(
  `CREATE VIEW records AS\n${rows.map(([resource, table]) => ` SELECT id,tenant_id,${q(resource)} AS resource,data,deleted_at,created_at,updated_at FROM ${table}`).join("\n UNION ALL\n")}\n UNION ALL SELECT id,tenant_id,resource,data,deleted_at,created_at,updated_at FROM other_records;`,
);
sql.push(
  `CREATE TRIGGER records_insert INSTEAD OF INSERT ON records BEGIN\n${rows.map(([resource, table]) => ` INSERT INTO ${table}(id,tenant_id,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource=${q(resource)} ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;`).join("\n")}\n INSERT INTO other_records(id,tenant_id,resource,data,deleted_at,created_at,updated_at) SELECT NEW.id,NEW.tenant_id,NEW.resource,NEW.data,NEW.deleted_at,NEW.created_at,NEW.updated_at WHERE NEW.resource NOT IN (${rows.map((r) => q(r[0])).join(",")}) ON CONFLICT(tenant_id,resource,id) DO UPDATE SET data=excluded.data,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at;\nEND;`,
);
sql.push(
  `CREATE TRIGGER records_update INSTEAD OF UPDATE ON records BEGIN\n SELECT CASE WHEN NEW.resource<>OLD.resource THEN RAISE(ABORT,'A record resource cannot be changed') END;\n${rows.map(([resource, table]) => ` UPDATE ${table} SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE OLD.resource=${q(resource)} AND tenant_id=OLD.tenant_id AND id=OLD.id;`).join("\n")}\n UPDATE other_records SET id=NEW.id,tenant_id=NEW.tenant_id,data=NEW.data,deleted_at=NEW.deleted_at,created_at=NEW.created_at,updated_at=NEW.updated_at WHERE resource=OLD.resource AND tenant_id=OLD.tenant_id AND id=OLD.id;\nEND;`,
);
sql.push(
  `CREATE TRIGGER records_delete INSTEAD OF DELETE ON records BEGIN\n${rows.map(([resource, table]) => ` DELETE FROM ${table} WHERE OLD.resource=${q(resource)} AND tenant_id=OLD.tenant_id AND id=OLD.id;`).join("\n")}\n DELETE FROM other_records WHERE resource=OLD.resource AND tenant_id=OLD.tenant_id AND id=OLD.id;\nEND;`,
);
sql.push(
  `CREATE TABLE video_collections(tenant_id TEXT NOT NULL,video_id TEXT NOT NULL,collection_id TEXT NOT NULL,PRIMARY KEY(tenant_id,video_id,collection_id),FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,collection_id) REFERENCES collections(tenant_id,id) ON DELETE CASCADE);`,
);
sql.push(
  `CREATE TABLE channel_collections(tenant_id TEXT NOT NULL,channel_id TEXT NOT NULL,collection_id TEXT NOT NULL,PRIMARY KEY(tenant_id,channel_id,collection_id),FOREIGN KEY(tenant_id,channel_id) REFERENCES channels(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,collection_id) REFERENCES collections(tenant_id,id) ON DELETE CASCADE);`,
);
sql.push(
  `CREATE TABLE programme_items(tenant_id TEXT NOT NULL,programme_id TEXT NOT NULL,position INTEGER NOT NULL,video_id TEXT NOT NULL,moment_id TEXT,PRIMARY KEY(tenant_id,programme_id,position),FOREIGN KEY(tenant_id,programme_id) REFERENCES programmes(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,moment_id,video_id) REFERENCES moments(tenant_id,id,video_id) ON DELETE CASCADE);`,
);
sql.push(
  `CREATE TABLE programme_profiles(tenant_id TEXT NOT NULL,programme_id TEXT NOT NULL,profile_id TEXT NOT NULL,PRIMARY KEY(tenant_id,programme_id,profile_id),FOREIGN KEY(tenant_id,programme_id) REFERENCES programmes(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,profile_id) REFERENCES profiles(tenant_id,id) ON DELETE CASCADE);`,
);
sql.push(
  `CREATE TABLE watchlist_items(tenant_id TEXT NOT NULL,watchlist_id TEXT NOT NULL,video_id TEXT NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(tenant_id,watchlist_id,video_id),FOREIGN KEY(tenant_id,watchlist_id) REFERENCES watchlists(tenant_id,id) ON DELETE CASCADE,FOREIGN KEY(tenant_id,video_id) REFERENCES videos(tenant_id,id) ON DELETE CASCADE);`,
);
for (const [table, junction, parent, path, child, target] of [
  [
    "videos",
    "video_collections",
    "video_id",
    "collectionIds",
    "collection_id",
    "collections",
  ],
  [
    "channels",
    "channel_collections",
    "channel_id",
    "collectionIds",
    "collection_id",
    "collections",
  ],
  [
    "programmes",
    "programme_profiles",
    "programme_id",
    "profileIds",
    "profile_id",
    "profiles",
  ],
  [
    "watchlists",
    "watchlist_items",
    "watchlist_id",
    "videos",
    "video_id",
    "videos",
  ],
]) {
  const position = table === "watchlists";
  sql.push(
    `INSERT OR IGNORE INTO ${junction}(tenant_id,${parent},${child}${position ? ",position" : ""}) SELECT p.tenant_id,p.id,j.value${position ? ",CAST(j.key AS INTEGER)" : ""} FROM ${table} p,json_each(p.data,${q("$." + path)}) j JOIN ${target} c ON c.tenant_id=p.tenant_id AND c.id=j.value;`,
  );
  for (const action of ["INSERT", "UPDATE OF data"])
    sql.push(
      `CREATE TRIGGER ${table}_${junction}_${action.startsWith("INSERT") ? "insert" : "update"} AFTER ${action} ON ${table} BEGIN DELETE FROM ${junction} WHERE tenant_id=NEW.tenant_id AND ${parent}=NEW.id; INSERT OR IGNORE INTO ${junction}(tenant_id,${parent},${child}${position ? ",position" : ""}) SELECT NEW.tenant_id,NEW.id,value${position ? ",CAST(key AS INTEGER)" : ""} FROM json_each(NEW.data,${q("$." + path)}); END;`,
    );
}
const programmeSelect = `SELECT NEW.tenant_id,NEW.id,CAST(j.key AS INTEGER),COALESCE(json_extract(j.value,'$.videoId'),(SELECT video_id FROM moments WHERE tenant_id=NEW.tenant_id AND id=json_extract(j.value,'$.momentId'))),json_extract(j.value,'$.momentId') FROM json_each(NEW.data,'$.queue') j`;
sql.push(
  `INSERT INTO programme_items(tenant_id,programme_id,position,video_id,moment_id) SELECT p.tenant_id,p.id,CAST(j.key AS INTEGER),COALESCE(json_extract(j.value,'$.videoId'),m.video_id),m.id FROM programmes p,json_each(p.data,'$.queue') j LEFT JOIN moments m ON m.tenant_id=p.tenant_id AND m.id=json_extract(j.value,'$.momentId') JOIN videos v ON v.tenant_id=p.tenant_id AND v.id=COALESCE(json_extract(j.value,'$.videoId'),m.video_id) WHERE m.id IS NULL OR m.video_id=v.id;`,
);
for (const action of ["INSERT", "UPDATE OF data"])
  sql.push(
    `CREATE TRIGGER programmes_items_${action.startsWith("INSERT") ? "insert" : "update"} AFTER ${action} ON programmes BEGIN DELETE FROM programme_items WHERE tenant_id=NEW.tenant_id AND programme_id=NEW.id; INSERT INTO programme_items(tenant_id,programme_id,position,video_id,moment_id) ${programmeSelect}; END;`,
  );
for (const [resource, table] of rows.filter(
  ([resource]) => resource !== "recovery",
)) {
  const recoveryId = `${q(resource + ":")}||NEW.id`;
  sql.push(
    `CREATE TRIGGER ${table}_recoverable AFTER UPDATE OF deleted_at ON ${table} WHEN NEW.deleted_at IS NOT NULL BEGIN INSERT INTO recovery_records(id,tenant_id,data,created_at,updated_at) VALUES(${recoveryId},NEW.tenant_id,json_object('id',${recoveryId},'sourceResource',${q(resource)},'recordId',NEW.id,'deletedAt',NEW.deleted_at),NEW.deleted_at,NEW.deleted_at) ON CONFLICT(tenant_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at; END;`,
  );
  sql.push(
    `CREATE TRIGGER ${table}_restored AFTER UPDATE OF deleted_at ON ${table} WHEN NEW.deleted_at IS NULL BEGIN DELETE FROM recovery_records WHERE tenant_id=NEW.tenant_id AND id=${recoveryId}; END;`,
  );
  sql.push(
    `CREATE TRIGGER ${table}_recovery_cleanup AFTER DELETE ON ${table} BEGIN DELETE FROM recovery_records WHERE tenant_id=OLD.tenant_id AND id=${q(resource + ":")}||OLD.id; END;`,
  );
}
sql.push(
  `INSERT OR IGNORE INTO recovery_records(id,tenant_id,data,created_at,updated_at) SELECT resource||':'||id,tenant_id,json_object('id',resource||':'||id,'sourceResource',resource,'recordId',id,'deletedAt',deleted_at),deleted_at,updated_at FROM records WHERE deleted_at IS NOT NULL AND resource<>'recovery';`,
);
sql.push(
  `CREATE TABLE devices(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,account_id TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,revoked_at TEXT,FOREIGN KEY(tenant_id,account_id) REFERENCES memberships(tenant_id,account_id) ON DELETE CASCADE);`,
);
sql.push(
  `CREATE TABLE device_codes(id TEXT PRIMARY KEY,device_code_hash TEXT UNIQUE,user_code_hash TEXT NOT NULL UNIQUE,kind TEXT NOT NULL CHECK(kind IN ('device','phone')),device_name TEXT NOT NULL,tenant_id TEXT,account_id TEXT,status TEXT NOT NULL CHECK(status IN ('pending','approved','consumed')),expires_at INTEGER NOT NULL,last_poll_at INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,approved_at TEXT,consumed_at TEXT,FOREIGN KEY(tenant_id,account_id) REFERENCES memberships(tenant_id,account_id) ON DELETE CASCADE);`,
);
sql.push(
  "CREATE INDEX device_codes_expiry ON device_codes(expires_at);",
  "CREATE INDEX devices_account ON devices(tenant_id,account_id,revoked_at);",
  "ALTER TABLE sessions ADD COLUMN device_name TEXT;",
  "ALTER TABLE sessions ADD COLUMN device_id TEXT REFERENCES devices(id) ON DELETE CASCADE;",
  `CREATE TRIGGER memberships_revoke_sessions AFTER DELETE ON memberships BEGIN DELETE FROM sessions WHERE tenant_id=OLD.tenant_id AND account_id=OLD.account_id; END;`,
);
sql.push(
  "DROP TABLE legacy_records_v1;",
  "INSERT INTO schema_migrations(version,applied_at) VALUES(2,strftime('%Y-%m-%dT%H:%M:%fZ','now'));",
  "COMMIT;",
);
writeFileSync(
  new URL("../migrations/0002_domain_tables.sql", import.meta.url),
  sql.join("\n\n") + "\n",
);
