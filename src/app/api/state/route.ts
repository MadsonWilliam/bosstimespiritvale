import { NextResponse } from "next/server";
import { latestDeaths, latestSightings, listPins, prunePins, stats } from "@/lib/db";
import { asServer, BadRequest } from "@/lib/validate";
import type { DeathReport, Sighting } from "@/lib/timers";

export const dynamic = "force-dynamic";

export type ChannelReports = {
  death: DeathReport | null;
  sighting: Sighting | null;
};

/** `${mapSlug}:${channel}` -> latest reports. */
export type StatePayload = {
  server: string;
  now: number;
  reports: Record<string, ChannelReports>;
  pins: { id: number; map_slug: string; channel: number; x: number; y: number; votes: number; nick: string | null }[];
  stats: { deaths: number; sightings: number; users: number };
};

/**
 * Returns the raw latest reports rather than computed timers: the client
 * recomputes states and odds every second from these, so a countdown stays
 * live between polls instead of freezing until the next fetch.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const server = asServer(url.searchParams.get("server") ?? "SA");

    // Expired tombstone marks are cleared here rather than on a timer: this
    // endpoint is polled constantly, so it is the cheapest sweep available.
    prunePins();

    const reports: Record<string, ChannelReports> = {};
    const slot = (key: string): ChannelReports =>
      (reports[key] ??= { death: null, sighting: null });

    for (const d of latestDeaths(server)) {
      slot(`${d.map_slug}:${d.channel}`).death = {
        diedAt: d.died_at,
        source: d.source,
        reporter: d.nick,
        reporterPoints: d.points,
      };
    }
    for (const s of latestSightings(server)) {
      slot(`${s.map_slug}:${s.channel}`).sighting = {
        seenAt: s.seen_at,
        tombPresent: Boolean(s.tomb_present),
        reporter: s.nick,
        reporterPoints: s.points,
      };
    }

    const payload: StatePayload = {
      server,
      now: Date.now(),
      reports,
      pins: listPins(),
      stats: stats(server),
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof BadRequest) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    console.error("GET /api/state", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
