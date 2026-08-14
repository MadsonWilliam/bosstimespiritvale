import { NextResponse } from "next/server";
import { leaderboard } from "@/lib/db";
import { levelFor, rankFor } from "@/lib/ranks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = leaderboard(25).map((u) => ({
      nick: u.nick,
      points: u.points,
      reports: u.reports,
      level: levelFor(u.points),
      rank: rankFor(u.points, u.nick),
    }));
    return NextResponse.json({ leaderboard: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/leaderboard", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
