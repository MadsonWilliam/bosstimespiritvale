import { NextResponse } from "next/server";
import { RESPAWN_MIN_MS } from "@/data/game";
import {
  awardPoints,
  latestDeathFor,
  recordDeath,
  recordSighting,
  upsertPin,
} from "@/lib/db";
import { BadCredentials, resolveIdentity } from "@/lib/auth";
import { POINTS } from "@/lib/ranks";
import { allow, clientKey } from "@/lib/rate-limit";
import {
  asChannel,
  asMapSlug,
  asServer,
  asTimestamp,
  asUnitInterval,
  BadRequest,
} from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Two reports of the same death rarely land on the same minute — someone reads
 * the tombstone, someone else eyeballs the clock. Within this much they are
 * treated as the same event rather than an attempt to overwrite the timer.
 */
const SAME_DEATH_TOLERANCE_MS = 3 * 60 * 1000;

/**
 * Anti-troll rule. Inside the guaranteed 60 minutes a boss simply cannot have
 * died again on its own, so a fresh death there can only be a mistake or
 * sabotage and the existing timer wins. Once the 30-minute window opens the
 * boss may genuinely have spawned and been killed — or summoned with a key —
 * so the newer report is accepted and the cycle restarts.
 */
function deathLock(
  server: string,
  mapSlug: string,
  channel: number,
  diedAt: number,
  now: number,
): { ok: true } | { ok: false; unlocksAt: number } {
  const last = latestDeathFor(server, mapSlug, channel);
  if (!last) return { ok: true };

  if (now - last.died_at >= RESPAWN_MIN_MS) return { ok: true };
  // Restating the same death is a confirmation, not an overwrite.
  if (Math.abs(diedAt - last.died_at) <= SAME_DEATH_TOLERANCE_MS) return { ok: true };

  return { ok: false, unlocksAt: last.died_at + RESPAWN_MIN_MS };
}

/**
 * Optional tombstone position travelling with a report. Deliberately NOT
 * called `pin`: that name already belongs to the 4-digit auth PIN on the same
 * body, and letting the two collide silently breaks authentication.
 */
function readTombPin(body: Record<string, unknown>): { x: number; y: number } | null {
  const p = body.tombPin as { x?: unknown; y?: unknown } | undefined | null;
  if (!p || typeof p !== "object") return null;
  return { x: asUnitInterval(p.x), y: asUnitInterval(p.y) };
}

/**
 *   kind = "death"    -> starts a fresh 60–90 min window
 *   kind = "sighting" -> tombstone there (optionally with its printed time) or gone
 */
export async function POST(req: Request) {
  try {
    if (!allow(`report:${clientKey(req)}`, { capacity: 60, refillPerMinute: 30 })) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();
    const server = asServer(body.server);
    const mapSlug = asMapSlug(body.mapSlug);
    const channel = asChannel(body.channel);
    const identity = resolveIdentity(body);
    const tombPin = readTombPin(body);
    const now = Date.now();

    let awarded = 0;
    const commitPin = () => {
      if (!tombPin) return;
      const { created } = upsertPin({ server, mapSlug, channel, ...tombPin, userId: identity.userId });
      if (identity.userId) awarded += created ? POINTS.pin : POINTS.pinConfirm;
    };

    if (body.kind === "sighting") {
      const seenAt = asTimestamp(body.at ?? now);
      const tombPresent = Boolean(body.tombPresent);

      // The tombstone prints the death time. Reading it off the stone pins the
      // window exactly, so it counts as a death report — subject to the same
      // anti-troll lock as any other.
      if (body.diedAt !== undefined && body.diedAt !== null) {
        const diedAt = asTimestamp(body.diedAt);
        const lock = deathLock(server, mapSlug, channel, diedAt, now);
        if (!lock.ok) {
          return NextResponse.json(
            { error: "locked_window", unlocksAt: lock.unlocksAt },
            { status: 409 },
          );
        }
        recordDeath({ server, mapSlug, channel, diedAt, source: "kill", userId: identity.userId });
        if (identity.userId) awarded += POINTS.kill;
      }

      recordSighting({ server, mapSlug, channel, seenAt, tombPresent, userId: identity.userId });
      if (identity.userId) awarded += POINTS.sighting;
      commitPin();

      if (identity.userId && awarded) awardPoints(identity.userId, awarded);
      return NextResponse.json({ ok: true, awarded });
    }

    const diedAt = asTimestamp(body.at ?? now);
    const lock = deathLock(server, mapSlug, channel, diedAt, now);
    if (!lock.ok) {
      return NextResponse.json(
        { error: "locked_window", unlocksAt: lock.unlocksAt },
        { status: 409 },
      );
    }

    recordDeath({ server, mapSlug, channel, diedAt, source: "kill", userId: identity.userId });
    if (identity.userId) awarded += POINTS.kill;
    commitPin();

    if (identity.userId && awarded) awardPoints(identity.userId, awarded);
    return NextResponse.json({ ok: true, awarded });
  } catch (err) {
    if (err instanceof BadCredentials) {
      return NextResponse.json({ error: "bad_pin" }, { status: 401 });
    }
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("POST /api/report", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
