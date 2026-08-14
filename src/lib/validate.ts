import { CHANNELS, MAP_BY_SLUG, SERVERS, type Channel, type ServerId } from "@/data/game";

/** Reports older than this are almost certainly a typo, not history. */
const MAX_BACKDATE_MS = 6 * 60 * 60 * 1000;
/** Small tolerance for clock skew between the reporter and the server. */
const MAX_FUTURE_MS = 2 * 60 * 1000;

export class BadRequest extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function asServer(v: unknown): ServerId {
  if (typeof v === "string" && (SERVERS as readonly string[]).includes(v)) {
    return v as ServerId;
  }
  throw new BadRequest("invalid_server");
}

export function asMapSlug(v: unknown): string {
  if (typeof v === "string" && MAP_BY_SLUG.has(v)) return v;
  throw new BadRequest("invalid_map");
}

export function asChannel(v: unknown): Channel {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n === "number" && (CHANNELS as readonly number[]).includes(n)) {
    return n as Channel;
  }
  throw new BadRequest("invalid_channel");
}

export function asTimestamp(v: unknown, now = Date.now()): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new BadRequest("invalid_time");
  if (n > now + MAX_FUTURE_MS) throw new BadRequest("time_in_future");
  if (n < now - MAX_BACKDATE_MS) throw new BadRequest("time_too_old");
  return Math.round(n);
}

export function asUnitInterval(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) {
    throw new BadRequest("invalid_coordinate");
  }
  return n;
}

/**
 * Nicknames are the only text we store. Keep them to what SpiritVale itself
 * allows so the field can never carry a payload or a slur-by-unicode-trick.
 */
const NICK_RE = /^[A-Za-z0-9][A-Za-z0-9 _.-]{1,15}$/;

export function asNick(v: unknown): string {
  if (typeof v !== "string") throw new BadRequest("invalid_nick");
  const nick = v.trim().replace(/\s+/g, " ");
  if (!NICK_RE.test(nick)) throw new BadRequest("invalid_nick");
  return nick;
}

export function asPin(v: unknown): string {
  if (typeof v !== "string" || !/^\d{4}$/.test(v)) throw new BadRequest("invalid_pin");
  return v;
}

export function asSource(v: unknown): "kill" | "summon" {
  if (v === "summon") return "summon";
  if (v === "kill" || v === undefined || v === null) return "kill";
  throw new BadRequest("invalid_source");
}
