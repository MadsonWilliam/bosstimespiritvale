import { NextResponse } from "next/server";
import { claimNick } from "@/lib/db";
import { levelFor, levelProgress, nextRank, rankFor } from "@/lib/ranks";
import { allow, clientKey } from "@/lib/rate-limit";
import { asNick, asPin, BadRequest } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Nick + PIN. There is no session cookie and no recovery flow: the client
 * keeps the pair in localStorage and re-sends it with each report. That is
 * deliberate — the whole account is a cosmetic scoreboard entry.
 */
export async function POST(req: Request) {
  try {
    if (!allow(`identity:${clientKey(req)}`, { capacity: 10, refillPerMinute: 3 })) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = await req.json();
    const nick = asNick(body.nick);
    const pin = asPin(body.pin);

    const result = claimNick(nick, pin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const { user, created } = result;
    return NextResponse.json({
      created,
      user: {
        ...user,
        level: levelFor(user.points),
        progress: levelProgress(user.points),
        rank: rankFor(user.points, user.nick),
        next: nextRank(user.points, user.nick),
      },
    });
  } catch (err) {
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("POST /api/identity", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
