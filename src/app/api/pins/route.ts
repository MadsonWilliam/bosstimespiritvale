import { NextResponse } from "next/server";
import { awardPoints, listPins, votePin } from "@/lib/db";
import { BadCredentials, resolveIdentity } from "@/lib/auth";
import { POINTS } from "@/lib/ranks";
import { allow, clientKey } from "@/lib/rate-limit";
import { asMapSlug, asServer, BadRequest } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const server = asServer(url.searchParams.get("server") ?? "SA");
    const slug = url.searchParams.get("map");
    return NextResponse.json({ pins: listPins(server, slug ? asMapSlug(slug) : undefined) });
  } catch (err) {
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("GET /api/pins", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * Confirms an existing tombstone pin. Placing or moving a pin is not done here
 * — it rides along with a death report (`POST /api/report`), so the same
 * anti-troll rules that guard the timer also guard the marker.
 */
export async function POST(req: Request) {
  try {
    if (!allow(`pins:${clientKey(req)}`, { capacity: 30, refillPerMinute: 15 })) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();
    const identity = resolveIdentity(body);

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
