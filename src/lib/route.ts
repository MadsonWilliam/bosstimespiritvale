/**
 * Route planner.
 *
 * The useful question is not "which boss is up right now" but "which boss will
 * still be up when I actually get there". So every candidate is scored at its
 * projected arrival time, walking the route forward one stop at a time.
 */

import { BOSS_MAPS, hopsBetween, type BossMap } from "@/data/game";
import { mapChance, type ChannelTimer } from "@/lib/timers";

/** Rough minutes to cross one map connection, including loading. */
const MINUTES_PER_HOP = 2.5;
/** Minutes spent at a stop checking all three channels (and fighting). */
const MINUTES_PER_STOP = 4;

const MS_PER_MIN = 60 * 1000;

export type RouteStop = {
  map: BossMap;
  /** ms epoch you are expected to arrive. */
  arrivesAt: number;
  /** 0..1 chance at least one channel has a boss up on arrival. */
  chance: number;
  /** Channels worth checking, best first. */
  channels: { channel: number; chance: number }[];
  hopsFromPrevious: number;
};

export type RouteInput = {
  /** Per-map channel timers, keyed by map slug. */
  timers: Record<string, ChannelTimer[]>;
  /** Where the player is standing now; null lets the planner pick freely. */
  startMap?: string | null;
  maxStops?: number;
  /** Only consider these slugs (e.g. a level-range filter). */
  only?: string[] | null;
  now?: number;
};

/** Chance of a single channel at an arbitrary future instant. */
function channelChanceAt(t: ChannelTimer, at: number): number {
  return mapChance([t], at);
}

export function planRoute({
  timers,
  startMap = null,
  maxStops = 6,
  only = null,
  now = Date.now(),
}: RouteInput): RouteStop[] {
  const allowed = new Set(only ?? BOSS_MAPS.map((m) => m.slug));
  const remaining = BOSS_MAPS.filter(
    (m) => m.boss !== null && allowed.has(m.slug) && (timers[m.slug]?.length ?? 0) > 0,
  );

  const stops: RouteStop[] = [];
  let position = startMap;
  let clock = now;

  while (stops.length < maxStops && remaining.length > 0) {
    let best: { idx: number; score: number; arrivesAt: number; hops: number } | null =
      null;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const hops = position ? hopsBetween(position, candidate.slug) : 0;
      const arrivesAt = clock + hops * MINUTES_PER_HOP * MS_PER_MIN;
      const chance = mapChance(timers[candidate.slug] ?? [], arrivesAt);

      // Slight penalty for travel so two equally likely bosses resolve in
      // favour of the closer one, without ever hiding a much better target.
      const score = chance / (1 + hops * 0.12);

      if (!best || score > best.score) {
        best = { idx: i, score, arrivesAt, hops };
      }
    }

    if (!best || best.score <= 0.005) break;

    const [map] = remaining.splice(best.idx, 1);
    const channels = (timers[map.slug] ?? [])
      .map((t) => ({ channel: t.channel, chance: channelChanceAt(t, best!.arrivesAt) }))
      .sort((a, b) => b.chance - a.chance);

    stops.push({
      map,
      arrivesAt: best.arrivesAt,
      chance: mapChance(timers[map.slug] ?? [], best.arrivesAt),
      channels,
      hopsFromPrevious: best.hops,
    });

    position = map.slug;
    clock = best.arrivesAt + MINUTES_PER_STOP * MS_PER_MIN;
  }

  return stops;
}
