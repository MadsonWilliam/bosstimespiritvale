/**
 * Route planner.
 *
 * The useful question is not "which boss is up right now" but "which boss will
 * still be up when I actually get there". So every candidate is scored at its
 * projected arrival time, walking the route forward one stop at a time.
 *
 * Two things drive the order, in this priority:
 *
 *   1. Time. A boss deep into its 30-minute window beats everything else, and
 *      one that has not opened yet is a "go there next", not a "go there now".
 *   2. Difficulty, as a light tiebreak only. There is no reliable map-to-map
 *      distance in SpiritVale — some maps have a warp, some do not — so each
 *      map carries a hand-calibrated 1..2 effort value. It nudges near-ties and
 *      is never allowed to outrank the clock.
 */

import { BOSS_MAPS, type BossMap } from "@/data/game";
import {
  channelChanceAt,
  mapChanceAt,
  peakAt,
  type BossState,
  type ChannelTimer,
} from "@/lib/timers";

/** Minutes to reach and clear a difficulty-1.0 map, travel plus the fight. */
const MINUTES_PER_STOP = 7;

/**
 * Most a full point of difficulty may shift the ranking, in minutes. Small on
 * purpose: it separates two targets that are otherwise close in time and
 * nothing more.
 */
const DIFFICULTY_TIEBREAK_MINUTES = 6;

const MS_PER_MIN = 60 * 1000;

export type RouteStop = {
  map: BossMap;
  /** ms epoch you are expected to arrive. */
  arrivesAt: number;
  /** 0..1 chance at least one channel has a boss up on arrival. */
  chance: number;
  /**
   * What the lead channel is doing *right now*. Drives the colour and the
   * badge, so a stop reads the same here as it does on the timer board — a
   * map still inside its 60 minutes is blue in both places.
   */
  stateNow: BossState;
  /** What that channel will be doing when you get there. */
  stateAtArrival: BossState;
  /** The channel that made this stop worth taking. */
  leadChannel: number;
  opensAt: number | null;
  closesAt: number | null;
  /** When this stop is at its best — the moment to aim for. */
  peakAt: number | null;
  channels: { channel: number; chance: number; state: BossState }[];
};

export type RouteInput = {
  timers: Record<string, ChannelTimer[]>;
  maxStops?: number;
  only?: string[] | null;
  now?: number;
};

/**
 * A route is a plan for where to go next, so it only ever contains bosses that
 * are up or still on the clock. Anything whose window has already closed by the
 * time you would arrive is gone — putting it on the list is noise, not advice.
 */
const ROUTABLE: BossState[] = ["alive", "window", "waiting"];

/** Tier 0 is worth walking to now; tier 1 is where you go afterwards. */
const tierOf = (state: BossState) => (state === "waiting" ? 1 : 0);

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
    let best:
      | { idx: number; tier: number; score: number; arrivesAt: number; chance: number }
      | null = null;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const arrivesAt = clock + candidate.difficulty * MINUTES_PER_STOP * MS_PER_MIN;
      const list = timers[candidate.slug] ?? [];

      // Judge the map by its most promising *routable* channel. Filtering has
      // to happen before ranking: an unreported channel is not tier 0, it is
      // no channel at all, and letting it lead would drop the whole map.
      // Only channels you could still catch count — but the priority tier is
      // decided by what they are doing *now*, so "already in the 30-minute
      // window" outranks "still counting down", which is how a player reads
      // the board.
      const catchable = list.filter((t) => ROUTABLE.includes(stateAt(t, arrivesAt)));
      if (catchable.length === 0) continue;

      const leadNow = catchable
        .map((t) => t.state)
        .sort((a, b) => tierOf(a) - tierOf(b))[0];

      const tier = tierOf(leadNow);
      const chance = mapChanceAt(list, arrivesAt);
      const nudge = (candidate.difficulty - 1) * DIFFICULTY_TIEBREAK_MINUTES;

      /*
       * Tier 0 — up or in the window: the odds decide, and difficulty is worth
       *   at most a couple of percentage points of them.
       * Tier 1 — still inside the guaranteed 60 minutes: nothing to fight yet,
       *   so rank by how long you would stand around waiting, plus at most
       *   DIFFICULTY_TIEBREAK_MINUTES for a painful map. Negated so that, like
       *   tier 0, higher is better.
       */
      const score =
        tier === 0
          ? chance - nudge * 0.004
          : -(minutesUntilOpen(list, arrivesAt) + nudge);

      const better =
        !best || tier < best.tier || (tier === best.tier && score > best.score);
      if (better) best = { idx: i, tier, score, arrivesAt, chance };
    }

    if (!best) break;

    const [map] = remaining.splice(best.idx, 1);
    const arrivesAt = best.arrivesAt;

    const list = timers[map.slug] ?? [];
    const channels = list
      .map((t) => ({
        timer: t,
        channel: t.channel,
        chance: channelChanceAt(t, arrivesAt),
        stateNow: t.state,
        state: stateAt(t, arrivesAt),
      }))
      .filter((c) => ROUTABLE.includes(c.state))
      // Ready-to-fight channels first, then the ones still counting down.
      .sort((a, b) => tierOf(a.stateNow) - tierOf(b.stateNow) || b.chance - a.chance);

    const lead = channels[0];

    stops.push({
      map,
      arrivesAt,
      chance: best.chance,
      stateNow: lead?.stateNow ?? "unknown",
      stateAtArrival: lead?.state ?? "unknown",
      leadChannel: lead?.channel ?? 1,
      opensAt: lead?.timer.opensAt ?? null,
      closesAt: lead?.timer.closesAt ?? null,
      peakAt: lead ? peakAt(lead.timer) : null,
      channels: channels.map(({ channel, chance, stateNow }) => ({
        channel,
        chance,
        state: stateNow,
      })),
    });

    clock = arrivesAt;
  }

  return stops;
}

/** Minutes you would still be waiting at `at` for the soonest channel to open. */
function minutesUntilOpen(timers: ChannelTimer[], at: number): number {
  const waits = timers
    .filter((t) => t.opensAt !== null && t.opensAt > at)
    .map((t) => (t.opensAt! - at) / MS_PER_MIN);
  return waits.length ? Math.min(...waits) : 0;
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
