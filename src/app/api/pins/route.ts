import { NextResponse } from "next/server";
import { addPin, awardPoints, hasPin, listPins, votePin } from "@/lib/db";
import { BadCredentials, resolveIdentity } from "@/lib/auth";
import { POINTS } from "@/lib/ranks";
import { allow, clientKey } from "@/lib/rate-limit";
import {
  asChannel,
  asMapSlug,
  asUnitInterval,
  BadRequest,
} from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("map");
    return NextResponse.json({ pins: listPins(slug ? asMapSlug(slug) : undefined) });
  } catch (err) {
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("GET /api/pins", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * Either drop a new tombstone marker (x/y as 0..1 fractions of the minimap) or
 * confirm an existing one. Confirmations are what makes a pin trustworthy, so
 * they are worth points too — just fewer.
 */
export async function POST(req: Request) {
  try {
    if (!allow(`pins:${clientKey(req)}`, { capacity: 30, refillPerMinute: 15 })) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();
    const identity = resolveIdentity(body);

    if (body.pinId !== undefined) {
      if (!identity.userId) {
        return NextResponse.json({ error: "identity_required" }, { status: 401 });
      }
      const pinId = Number(body.pinId);
      if (!Number.isInteger(pinId) || pinId <= 0) {
        return NextResponse.json({ error: "invalid_pin_id" }, { status: 400 });
      }
      const counted = votePin(pinId, identity.userId);
      if (counted) awardPoints(identity.userId, POINTS.pinConfirm);
      return NextResponse.json({ ok: true, counted, awarded: counted ? POINTS.pinConfirm : 0 });
    }

    const mapSlug = asMapSlug(body.mapSlug);
    const channel = asChannel(body.channel);
    const x = asUnitInterval(body.x);
    const y = asUnitInterval(body.y);

    const first = !hasPin(mapSlug, channel);
    const id = addPin({ mapSlug, channel, x, y, userId: identity.userId });

    const awarded = identity.userId ? (first ? POINTS.pin : POINTS.pinConfirm) : 0;
    if (awarded) awardPoints(identity.userId!, awarded);

    return NextResponse.json({ ok: true, id, awarded });
  } catch (err) {
    if (err instanceof BadCredentials) {
      return NextResponse.json({ error: "bad_pin" }, { status: 401 });
    }
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("POST /api/pins", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
