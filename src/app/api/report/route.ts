import { NextResponse } from "next/server";
import { awardPoints, recordDeath, recordSighting } from "@/lib/db";
import { BadCredentials, resolveIdentity } from "@/lib/auth";
import { POINTS } from "@/lib/ranks";
import { allow, clientKey } from "@/lib/rate-limit";
import {
  asChannel,
  asMapSlug,
  asServer,
  asSource,
  asTimestamp,
  BadRequest,
} from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Two kinds of report share this endpoint because they share every field but
 * one, and the reporting UI switches between them with a single toggle.
 *
 *   kind = "death"    -> starts a fresh 60–90 min window
 *   kind = "sighting" -> narrows the current window (tombstone there or gone)
 */
export async function POST(req: Request) {
  try {
    // Generous: a whole guild can share one NAT address, and the cost of a
    // false block is a player who stops reporting.
    if (!allow(`report:${clientKey(req)}`, { capacity: 60, refillPerMinute: 30 })) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();
    const server = asServer(body.server);
    const mapSlug = asMapSlug(body.mapSlug);
    const channel = asChannel(body.channel);
    const identity = resolveIdentity(body);

    if (body.kind === "sighting") {
      const seenAt = asTimestamp(body.at ?? Date.now());
      const tombPresent = Boolean(body.tombPresent);
      recordSighting({ server, mapSlug, channel, seenAt, tombPresent, userId: identity.userId });
      if (identity.userId) awardPoints(identity.userId, POINTS.sighting);
      return NextResponse.json({ ok: true, awarded: identity.userId ? POINTS.sighting : 0 });
    }

    const diedAt = asTimestamp(body.at ?? Date.now());
    const source = asSource(body.source);
    recordDeath({ server, mapSlug, channel, diedAt, source, userId: identity.userId });
    if (identity.userId) awardPoints(identity.userId, POINTS[source]);

    return NextResponse.json({
      ok: true,
      awarded: identity.userId ? POINTS[source] : 0,
    });
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
