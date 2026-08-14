/**
 * Route planner.
 *
 * The useful question is not "which boss is up right now" but "which boss will
 * still be up when I actually get there". So every candidate is scored at its
 * projected arrival time, walking the route forward one stop at a time.
 *
 * There is no reliable map-to-map distance in SpiritVale — some maps have a
 * warp, some do not, and sizes vary wildly. So travel is modelled with a
 * per-map `difficulty` from 1 (trivial) to 2 (long trek), which the community
 * calibrates by hand. That is honest about what we can and cannot measure.
 */

import { BOSS_MAPS, type BossMap } from "@/data/game";
import { channelChanceAt, mapChanceAt, type BossState, type ChannelTimer } from "@/lib/timers";

/** Minutes to reach and clear a difficulty-1.0 map, travel plus the fight. */
const MINUTES_PER_STOP = 7;

const MS_PER_MIN = 60 * 1000;

export type RouteStop = {
  map: BossMap;
  /** ms epoch you are expected to arrive. */
  arrivesAt: number;
  /** 0..1 chance at least one channel has a boss up on arrival. */
  chance: number;
  /** What the best channel will be doing when you get there. */
  stateAtArrival: BossState;
  /** Earliest/latest spawn of the channel that drives this stop. */
  opensAt: number | null;
  closesAt: number | null;
  /** Channels worth checking, best first. */
  channels: { channel: number; chance: number; state: BossState }[];
};

export type RouteInput = {
  /** Per-map channel timers, keyed by map slug. */
  timers: Record<string, ChannelTimer[]>;
  maxStops?: number;
  /** Only consider these slugs. */
  only?: string[] | null;
  now?: number;
};

/**
 * Odds worth walking for. Below this a stop is noise: it pads the route with
 * maps nobody should detour to.
 */
const MIN_USEFUL_CHANCE = 0.08;

export function planRoute({
  timers,
  maxStops = 6,
  only = null,
  now = Date.now(),
}: RouteInput): RouteStop[] {
  const allowed = new Set(only ?? BOSS_MAPS.map((m) => m.slug));
  const remaining = BOSS_MAPS.filter(
    (m) =>
      m.boss !== null &&
      allowed.has(m.slug) &&
      // A map nobody has ever reported cannot be scheduled — there is no clock.
      (timers[m.slug] ?? []).some((t) => t.state !== "unknown"),
  );

  const stops: RouteStop[] = [];
  let clock = now;

  while (stops.length < maxStops && remaining.length > 0) {
    let best: { idx: number; score: number; arrivesAt: number; chance: number } | null =
      null;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const travelMs = candidate.difficulty * MINUTES_PER_STOP * MS_PER_MIN;
      const arrivesAt = clock + travelMs;
      const chance = mapChanceAt(timers[candidate.slug] ?? [], arrivesAt);

      // Harder maps must be meaningfully better to be worth the detour.
      const score = chance / candidate.difficulty;

      if (!best || score > best.score) {
        best = { idx: i, score, arrivesAt, chance };
      }
    }

    if (!best || best.chance < MIN_USEFUL_CHANCE) break;

    const [map] = remaining.splice(best.idx, 1);
    const arrivesAt = best.arrivesAt;

    const channels = (timers[map.slug] ?? [])
      .map((t) => ({
        channel: t.channel,
        chance: channelChanceAt(t, arrivesAt),
        state: stateAt(t, arrivesAt),
      }))
      .sort((a, b) => b.chance - a.chance);

    const lead = (timers[map.slug] ?? [])
      .slice()
      .sort((a, b) => channelChanceAt(b, arrivesAt) - channelChanceAt(a, arrivesAt))[0];

    stops.push({
      map,
      arrivesAt,
      chance: best.chance,
      stateAtArrival: channels[0]?.state ?? "unknown",
      opensAt: lead?.opensAt ?? null,
      closesAt: lead?.closesAt ?? null,
      channels,
    });

    clock = arrivesAt;
  }

  return stops;
}

/**
 * Projects a channel's state forward to `at`. "alive" is deliberately not
 * projected: a confirmed sighting decays into an ordinary window guess rather
 * than promising the boss will still be standing there later.
 */
function stateAt(t: ChannelTimer, at: number): BossState {
  if (t.state === "unknown") return "unknown";
  if (t.opensAt === null || t.closesAt === null) return t.state;
  if (t.state === "alive" && at < t.closesAt) return "alive";
  if (at < t.opensAt) return "waiting";
  if (at <= t.closesAt) return "window";
  return "overdue";
}
