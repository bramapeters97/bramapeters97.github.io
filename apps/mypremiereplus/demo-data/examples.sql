-- Run against demo-data/mypremiereplus.db in a SQLite client.
-- These examples contain fictional identities only. The copied hash intentionally
-- represents the documented local dummy password: premiere-demo.
PRAGMA foreign_keys = ON;

-- 1. Adding only this account row makes it appear immediately in the app's local
--    demo directory as "needs membership". It grants no archive access.
INSERT OR IGNORE INTO accounts(id,email,name,password_hash,created_at)
SELECT 'manual-taylor','taylor@example.test','Taylor Demo',password_hash,
       strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM accounts WHERE id='demo-owner';

-- 2. A membership enables sign-in to the chosen archive. Profiles do not grant roles.
INSERT OR IGNORE INTO memberships(tenant_id,account_id,role)
VALUES('demo','manual-taylor','viewer');

-- 3. Add a viewing profile. All IDs and domain references stay in the same archive.
INSERT OR IGNORE INTO records(id,tenant_id,resource,data,created_at,updated_at)
VALUES('demo-profile-taylor','demo','profiles',
 json_object('id','demo-profile-taylor','name','Taylor','avatar','/artwork/profile.svg','color','#8fb4d7'),
 strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- 4. Clone fictional metadata into a draft. This preserves that film's approved
--    sample source, verified duration and existing collection links.
INSERT OR IGNORE INTO records(id,tenant_id,resource,data,created_at,updated_at)
SELECT 'demo-video-manual','demo','videos',
 json_set(data,'$.id','demo-video-manual','$.title','A manually added sample',
          '$.status','draft','$.featured',json('false'),'$.priority',0),
 strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM records WHERE tenant_id='demo' AND resource='videos' AND id='demo-video-1';

-- 5. The interval must lie inside its original film: 0 <= start < end <= duration.
INSERT OR IGNORE INTO records(id,tenant_id,resource,data,created_at,updated_at)
VALUES('demo-moment-manual','demo','moments',
 json_object('id','demo-moment-manual','videoId','demo-video-1',
             'title','A manually saved second','start',1,'end',2,
             'familyTv',json('true'),'approved',json('true'),
             'visibility','all','gathering',json('true'),'creator','manual-taylor'),
 strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- Useful inspection queries. Memberships connect accounts to archive identity.
SELECT a.email,a.name,m.tenant_id,m.role,json_extract(t.settings,'$.name') AS archive
FROM accounts a LEFT JOIN memberships m ON m.account_id=a.id
LEFT JOIN tenants t ON t.id=m.tenant_id ORDER BY a.email;

SELECT tenant_id,resource,COUNT(*) AS count
FROM records WHERE deleted_at IS NULL GROUP BY tenant_id,resource ORDER BY tenant_id,resource;

SELECT id,json_extract(data,'$.title') AS title,json_extract(data,'$.status') AS status
FROM records WHERE tenant_id='demo' AND resource='videos' AND deleted_at IS NULL;

-- Physical domain tables expose generated, typed columns for inspection.
SELECT id,title,recording_year,duration,status,media_asset_id FROM videos WHERE tenant_id='demo';
SELECT m.title,v.title AS source_film,m.start_seconds,m.end_seconds
FROM moments m JOIN videos v ON v.tenant_id=m.tenant_id AND v.id=m.video_id
WHERE m.tenant_id='demo';

-- Stock dataset: inspect per-archive source relationships, not a DB per profile.
SELECT tenant_id,json_extract(data,'$.demoMediaId') AS media_id,COUNT(*) AS film_records
FROM videos WHERE json_extract(data,'$.demoMediaId') IS NOT NULL
GROUP BY tenant_id,media_id ORDER BY tenant_id,media_id;
SELECT tenant_id,profile_id,account_id FROM watchlists ORDER BY tenant_id,profile_id;

-- Edit JSON properties; generated title/year columns are read-only.
UPDATE videos SET data=json_set(data,'$.title','My directly edited sample')
WHERE tenant_id='demo' AND id='demo-video-manual';

-- A direct relationship row appears in the app on its next request.
INSERT OR IGNORE INTO video_collections(tenant_id,video_id,collection_id)
VALUES('demo','demo-video-manual','demo-collection-2');
