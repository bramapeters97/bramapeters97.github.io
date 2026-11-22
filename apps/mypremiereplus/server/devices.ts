import { createHash, randomBytes, randomInt } from "node:crypto";
import { Store, id, now, type Actor, type Data } from "./store.js";
export class DeviceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function fail(status: number, message: string): never {
  throw new DeviceError(status, message);
}
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () =>
  Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join(
    "",
  );
const normalize = (value: unknown) =>
  typeof value === "string" ? value.toUpperCase().replace(/[\s-]/g, "") : "";
export type DeviceResult = {
  body: Data;
  accountId?: string;
  tenantId?: string;
  device?: { id: string; name: string };
};

/** Browser pairing only. Secrets are stored as hashes and never included in catalogues. */
export class DeviceService {
  private limits = new Map<string, { attempts: number; until: number }>();
  constructor(private store: Store) {}
  private rate(key: string, max = 20) {
    const timestamp = Date.now();
    let state = this.limits.get(key);
    if (!state || state.until < timestamp) {
      state = { attempts: 0, until: timestamp + 60000 };
      this.limits.set(key, state);
    }
    if (++state.attempts > max)
      fail(429, "Too many code attempts. Please wait one minute.");
  }
  private name(value: unknown, fallback: string) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !value.trim() || value.length > 100)
      fail(400, "Choose a device name up to 100 characters.");
    return value.trim();
  }
  private uniqueUserCode() {
    let value = code();
    while (
      this.store.db
        .prepare("SELECT 1 FROM device_codes WHERE user_code_hash=?")
        .get(hash(value))
    )
      value = code();
    return value;
  }
  start(input: Data, ip: string): DeviceResult {
    this.rate(`start:${ip}`, 10);
    const deviceCode = randomBytes(32).toString("hex"),
      userCode = this.uniqueUserCode(),
      expiresAt = Date.now() + 5 * 60000;
    this.store.db
      .prepare(
        "INSERT INTO device_codes(id,device_code_hash,user_code_hash,kind,device_name,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        id(),
        hash(deviceCode),
        hash(userCode),
        "device",
        this.name(input.deviceName, "Living-room browser"),
        "pending",
        expiresAt,
        now(),
      );
    return {
      body: {
        deviceCode,
        userCode,
        verificationUrl: "/activate",
        expiresAt: new Date(expiresAt).toISOString(),
        interval: 3,
        status: "pending",
      },
    };
  }
  poll(input: Data, ip: string): DeviceResult {
    this.rate(`poll:${ip}`, 100);
    if (
      typeof input.deviceCode !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.deviceCode)
    )
      fail(400, "Invalid device request.");
    const row = this.store.db
      .prepare("SELECT * FROM device_codes WHERE device_code_hash=? AND kind=?")
      .get(hash(input.deviceCode), "device") as Data | undefined;
    if (!row) fail(404, "Device request not found.");
    if (row.expires_at <= Date.now())
      return { body: { status: "expired", interval: 3 } };
    if (row.status === "consumed")
      return { body: { status: "consumed", interval: 3 } };
    if (row.status === "pending") {
      if (row.last_poll_at && Date.now() - row.last_poll_at < 3000)
        return { body: { status: "slow_down", interval: 3 } };
      this.store.db
        .prepare(
          "UPDATE device_codes SET last_poll_at=?,attempts=attempts+1 WHERE id=?",
        )
        .run(Date.now(), row.id);
      return { body: { status: "pending", interval: 3 } };
    }
    return this.consume(row);
  }
  approve(actor: Actor, input: Data, ip: string): DeviceResult {
    this.rate(`approve:${actor.accountId}:${ip}`, 10);
    const value = normalize(input.userCode);
    if (!/^[A-Z2-9]{8}$/.test(value))
      fail(400, "Enter the eight-character code shown on the other browser.");
    const row = this.store.db
      .prepare("SELECT * FROM device_codes WHERE user_code_hash=? AND kind=?")
      .get(hash(value), "device") as Data | undefined;
    if (!row || row.expires_at <= Date.now())
      fail(404, "That code has expired or is not available.");
    if (row.status !== "pending")
      fail(409, "That browser has already been approved.");
    const changed = this.store.db
      .prepare(
        "UPDATE device_codes SET status=?,account_id=?,tenant_id=?,approved_at=? WHERE id=? AND status=? AND expires_at>?",
      )
      .run(
        "approved",
        actor.accountId,
        actor.tenantId,
        now(),
        row.id,
        "pending",
        Date.now(),
      );
    if (changed.changes !== 1) fail(409, "That code has already been used.");
    return {
      body: {
        status: "approved",
        deviceName: row.device_name,
        message: "The other browser can now sign in to your account.",
      },
    };
  }
  issueCode(actor: Actor, input: Data, ip: string): DeviceResult {
    this.rate(`code:${actor.accountId}:${ip}`, 5);
    const userCode = this.uniqueUserCode(),
      expiresAt = Date.now() + 5 * 60000;
    this.store.db
      .prepare(
        "INSERT INTO device_codes(id,user_code_hash,kind,device_name,tenant_id,account_id,status,expires_at,created_at,approved_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id(),
        hash(userCode),
        "phone",
        this.name(input.deviceName, "Linked browser"),
        actor.tenantId,
        actor.accountId,
        "approved",
        expiresAt,
        now(),
        now(),
      );
    return {
      body: {
        code: userCode,
        expiresAt: new Date(expiresAt).toISOString(),
        message:
          "Use this one-time code on the other browser within five minutes.",
      },
    };
  }
  redeem(input: Data, ip: string): DeviceResult {
    this.rate(`redeem:${ip}`, 10);
    const value = normalize(input.code);
    if (!/^[A-Z2-9]{8}$/.test(value))
      fail(400, "Enter a valid eight-character code.");
    const row = this.store.db
      .prepare("SELECT * FROM device_codes WHERE user_code_hash=? AND kind=?")
      .get(hash(value), "phone") as Data | undefined;
    if (!row || row.status !== "approved" || row.expires_at <= Date.now())
      fail(404, "That code has expired or has already been used.");
    return this.consume(row);
  }
  private consume(row: Data): DeviceResult {
    const member = this.store.db
      .prepare(
        "SELECT a.id,a.name,a.email,m.role FROM accounts a JOIN memberships m ON m.account_id=a.id WHERE a.id=? AND m.tenant_id=?",
      )
      .get(row.account_id, row.tenant_id) as Data | undefined;
    if (!member) fail(403, "This account no longer has access to the archive.");
    const device = { id: id(), name: row.device_name };
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const changed = this.store.db
        .prepare(
          "UPDATE device_codes SET status=?,consumed_at=? WHERE id=? AND status=? AND expires_at>?",
        )
        .run("consumed", now(), row.id, "approved", Date.now());
      if (changed.changes !== 1) fail(409, "That code has already been used.");
      this.store.db
        .prepare(
          "INSERT INTO devices(id,tenant_id,account_id,name,created_at,last_seen_at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          device.id,
          row.tenant_id,
          row.account_id,
          device.name,
          now(),
          now(),
        );
      this.store.db.exec("COMMIT");
    } catch (error) {
      this.store.db.exec("ROLLBACK");
      throw error;
    }
    return {
      accountId: row.account_id,
      tenantId: row.tenant_id,
      device,
      body: {
        status: "approved",
        account: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
        },
        device: { id: device.id, name: device.name },
      },
    };
  }
  list(actor: Actor) {
    return this.store.db
      .prepare(
        "SELECT d.id,d.name,d.created_at AS createdAt,d.last_seen_at AS lastSeenAt,d.revoked_at AS revokedAt,CASE WHEN EXISTS(SELECT 1 FROM sessions s WHERE s.id=? AND s.device_id=d.id) THEN 1 ELSE 0 END AS current FROM devices d WHERE d.tenant_id=? AND d.account_id=? ORDER BY d.created_at DESC",
      )
      .all(actor.id, actor.tenantId, actor.accountId);
  }
  revoke(actor: Actor, deviceId: string): DeviceResult {
    const device = this.store.db
      .prepare(
        "SELECT id FROM devices WHERE id=? AND tenant_id=? AND account_id=?",
      )
      .get(deviceId, actor.tenantId, actor.accountId);
    if (!device) fail(404, "Device not found.");
    this.store.db
      .prepare("UPDATE devices SET revoked_at=? WHERE id=?")
      .run(now(), deviceId);
    this.store.db
      .prepare(
        "DELETE FROM sessions WHERE device_id=? AND account_id=? AND tenant_id=?",
      )
      .run(deviceId, actor.accountId, actor.tenantId);
    return { body: { revoked: true } };
  }
}
