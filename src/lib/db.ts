import Database from "better-sqlite3";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * SQLite lives on a mounted volume so the container stays disposable.
 * DATA_DIR is set by the Dockerfile; locally it falls back to ./data.
 */
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;

  mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(path.join(DATA_DIR, "bosstime.db"));

  conn.pragma("journal_mode = WAL");
  conn.pragma("synchronous = NORMAL");
  conn.pragma("foreign_keys = ON");
  conn.pragma("busy_timeout = 5000");

  migrate(conn);
  _db = conn;
  return conn;
}

function migrate(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY,
      nick         TEXT    NOT NULL,
      nick_key     TEXT    NOT NULL UNIQUE,
      pin_hash     TEXT    NOT NULL,
      points       INTEGER NOT NULL DEFAULT 0,
      reports      INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deaths (
      id         INTEGER PRIMARY KEY,
      server     TEXT    NOT NULL,
      map_slug   TEXT    NOT NULL,
      channel    INTEGER NOT NULL,
      died_at    INTEGER NOT NULL,
      source     TEXT    NOT NULL DEFAULT 'kill',
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deaths_lookup
      ON deaths (server, map_slug, channel, died_at DESC);

    CREATE TABLE IF NOT EXISTS sightings (
      id           INTEGER PRIMARY KEY,
      server       TEXT    NOT NULL,
      map_slug     TEXT    NOT NULL,
      channel      INTEGER NOT NULL,
      seen_at      INTEGER NOT NULL,
      tomb_present INTEGER NOT NULL,
      user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sightings_lookup
      ON sightings (server, map_slug, channel, seen_at DESC);

    -- Tombstone locations are map geometry, identical on every server, so pins
    -- are keyed by map + channel only.
    CREATE TABLE IF NOT EXISTS pins (
      id         INTEGER PRIMARY KEY,
      map_slug   TEXT    NOT NULL,
      channel    INTEGER NOT NULL,
      x          REAL    NOT NULL,
      y          REAL    NOT NULL,
      votes      INTEGER NOT NULL DEFAULT 1,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pins_lookup ON pins (map_slug, channel, votes DESC);

    CREATE TABLE IF NOT EXISTS pin_votes (
      pin_id  INTEGER NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (pin_id, user_id)
    );
  `);
}

/* ------------------------------------------------------------------ users */

const PIN_KEYLEN = 32;

function hashPin(pin: string, salt?: string): string {
  const s = salt ?? randomBytes(16).toString("hex");
  const derived = scryptSync(pin, s, PIN_KEYLEN).toString("hex");
  return `${s}:${derived}`;
}

function verifyPin(pin: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(pin, salt, PIN_KEYLEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== actual.length) return false;
  return timingSafeEqual(actual, expectedBuf);
}

export type UserRow = {
  id: number;
  nick: string;
  nick_key: string;
  pin_hash: string;
  points: number;
  reports: number;
  created_at: number;
  last_seen_at: number;
};

export const nickKey = (nick: string) => nick.trim().toLowerCase();

export type AuthResult =
  | { ok: true; created: boolean; user: PublicUser }
  | { ok: false; error: "bad_pin" };

export type PublicUser = {
  id: number;
  nick: string;
  points: number;
  reports: number;
};

const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  nick: u.nick,
  points: u.points,
  reports: u.reports,
});

export function findUser(nick: string): UserRow | undefined {
  return db()
    .prepare("SELECT * FROM users WHERE nick_key = ?")
    .get(nickKey(nick)) as UserRow | undefined;
}

/**
 * Claim a nickname or sign back into it. The PIN is the only thing stopping
 * someone from spending another player's reputation, so a wrong PIN never
 * reveals whether the nick exists beyond the failure itself.
 */
export function claimNick(nick: string, pin: string): AuthResult {
  const now = Date.now();
  const existing = findUser(nick);

  if (existing) {
    if (!verifyPin(pin, existing.pin_hash)) return { ok: false, error: "bad_pin" };
    db()
      .prepare("UPDATE users SET last_seen_at = ? WHERE id = ?")
      .run(now, existing.id);
    return { ok: true, created: false, user: toPublic(existing) };
  }

  const info = db()
    .prepare(
      `INSERT INTO users (nick, nick_key, pin_hash, points, reports, created_at, last_seen_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
    )
    .run(nick.trim(), nickKey(nick), hashPin(pin), now, now);

  const created = db()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(info.lastInsertRowid) as UserRow;
  return { ok: true, created: true, user: toPublic(created) };
}

export function awardPoints(userId: number, points: number) {
  db()
    .prepare(
      "UPDATE users SET points = points + ?, reports = reports + 1, last_seen_at = ? WHERE id = ?",
    )
    .run(points, Date.now(), userId);
}

export function leaderboard(limit = 25): PublicUser[] {
  return db()
    .prepare(
      `SELECT id, nick, points, reports FROM users
       WHERE points > 0
       ORDER BY points DESC, reports DESC, created_at ASC
       LIMIT ?`,
    )
    .all(limit) as PublicUser[];
}

export function userCount(): number {
  const row = db().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  return row.n;
}

/* ----------------------------------------------------------------- deaths */

export type DeathRow = {
  id: number;
  server: string;
  map_slug: string;
  channel: number;
  died_at: number;
  source: "kill" | "summon";
  nick: string | null;
};

export function recordDeath(input: {
  server: string;
  mapSlug: string;
  channel: number;
  diedAt: number;
  source: "kill" | "summon";
  userId: number | null;
}): void {
  db()
    .prepare(
      `INSERT INTO deaths (server, map_slug, channel, died_at, source, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.server,
      input.mapSlug,
      input.channel,
      input.diedAt,
      input.source,
      input.userId,
      Date.now(),
    );
}

/** Most recent death per (map, channel) for one server. */
export function latestDeaths(server: string): DeathRow[] {
  return db()
    .prepare(
      `SELECT d.id, d.server, d.map_slug, d.channel, d.died_at, d.source, u.nick
       FROM deaths d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.server = ?
         AND d.died_at = (
           SELECT MAX(d2.died_at) FROM deaths d2
           WHERE d2.server = d.server AND d2.map_slug = d.map_slug AND d2.channel = d.channel
         )
       GROUP BY d.map_slug, d.channel`,
    )
    .all(server) as DeathRow[];
}

/* -------------------------------------------------------------- sightings */

export type SightingRow = {
  id: number;
  map_slug: string;
  channel: number;
  seen_at: number;
  tomb_present: number;
  nick: string | null;
};

export function recordSighting(input: {
  server: string;
  mapSlug: string;
  channel: number;
  seenAt: number;
  tombPresent: boolean;
  userId: number | null;
}): void {
  db()
    .prepare(
      `INSERT INTO sightings (server, map_slug, channel, seen_at, tomb_present, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.server,
      input.mapSlug,
      input.channel,
      input.seenAt,
      input.tombPresent ? 1 : 0,
      input.userId,
      Date.now(),
    );
}

export function latestSightings(server: string): SightingRow[] {
  return db()
    .prepare(
      `SELECT s.id, s.map_slug, s.channel, s.seen_at, s.tomb_present, u.nick
       FROM sightings s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.server = ?
         AND s.seen_at = (
           SELECT MAX(s2.seen_at) FROM sightings s2
           WHERE s2.server = s.server AND s2.map_slug = s.map_slug AND s2.channel = s.channel
         )
       GROUP BY s.map_slug, s.channel`,
    )
    .all(server) as SightingRow[];
}

/* ------------------------------------------------------------------- pins */

export type PinRow = {
  id: number;
  map_slug: string;
  channel: number;
  x: number;
  y: number;
  votes: number;
  nick: string | null;
};

export function listPins(mapSlug?: string): PinRow[] {
  const sql = `SELECT p.id, p.map_slug, p.channel, p.x, p.y, p.votes, u.nick
               FROM pins p LEFT JOIN users u ON u.id = p.user_id
               ${mapSlug ? "WHERE p.map_slug = ?" : ""}
               ORDER BY p.votes DESC, p.created_at ASC`;
  const stmt = db().prepare(sql);
  return (mapSlug ? stmt.all(mapSlug) : stmt.all()) as PinRow[];
}

export function addPin(input: {
  mapSlug: string;
  channel: number;
  x: number;
  y: number;
  userId: number | null;
}): number {
  const info = db()
    .prepare(
      `INSERT INTO pins (map_slug, channel, x, y, votes, user_id, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(input.mapSlug, input.channel, input.x, input.y, input.userId, Date.now());
  const pinId = Number(info.lastInsertRowid);
  if (input.userId) {
    db()
      .prepare("INSERT OR IGNORE INTO pin_votes (pin_id, user_id) VALUES (?, ?)")
      .run(pinId, input.userId);
  }
  return pinId;
}

/** Returns false when this user already backed that pin. */
export function votePin(pinId: number, userId: number): boolean {
  const res = db()
    .prepare("INSERT OR IGNORE INTO pin_votes (pin_id, user_id) VALUES (?, ?)")
    .run(pinId, userId);
  if (res.changes === 0) return false;
  db().prepare("UPDATE pins SET votes = votes + 1 WHERE id = ?").run(pinId);
  return true;
}

/** Does this map+channel already have a pin? Drives the "first pin" bonus. */
export function hasPin(mapSlug: string, channel: number): boolean {
  const row = db()
    .prepare("SELECT 1 AS x FROM pins WHERE map_slug = ? AND channel = ? LIMIT 1")
    .get(mapSlug, channel);
  return Boolean(row);
}

/* ------------------------------------------------------------------ stats */

/**
 * Counters for the header. Deaths and sightings are per-server — the whole
 * point of the server switch is that SA and NA share nothing — while the
 * contributor count is global, since reputation is not per-server.
 */
export function stats(server: string) {
  const d = db()
    .prepare("SELECT COUNT(*) AS n FROM deaths WHERE server = ?")
    .get(server) as { n: number };
  const s = db()
    .prepare("SELECT COUNT(*) AS n FROM sightings WHERE server = ?")
    .get(server) as { n: number };
  return { deaths: d.n, sightings: s.n, users: userCount() };
}
