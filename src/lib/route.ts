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
      const travelMs = candidate.difficulty * MINUTES_PER_STOP * MS_PER_MIN;
      const arrivesAt = clock + travelMs;
      const list = timers[candidate.slug] ?? [];

      // Judge the map by its most promising *routable* channel. Filtering has
      // to happen before ranking: an unreported channel is not tier 0, it is
      // no channel at all, and letting it lead would drop the whole map.
      const leadState = list
        .map((t) => stateAt(t, arrivesAt))
        .filter((s) => ROUTABLE.includes(s))
        .sort((a, b) => tierOf(a) - tierOf(b))[0];
      if (!leadState) continue;

      const tier = tierOf(leadState);
      const chance = mapChanceAt(list, arrivesAt);

      /*
       * Tier 0 — already up or in the window: go for the best odds, discounted
       *   by how painful the map is to run.
       * Tier 1 — still inside the guaranteed 60 minutes: nothing to fight yet,
       *   so the question is only "which is cheapest to be standing at when it
       *   pops". Waiting minutes multiplied by difficulty, lowest wins: a 14
       *   min wait on an easy map beats a 10 min wait on a hard one.
       */
      const score =
        tier === 0
          ? chance / candidate.difficulty
          : -minutesUntilOpen(list, arrivesAt) * candidate.difficulty;

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
        state: stateAt(t, arrivesAt),
      }))
      .filter((c) => ROUTABLE.includes(c.state))
      // Ready-to-fight channels first, then the ones still counting down.
      .sort((a, b) => tierOf(a.state) - tierOf(b.state) || b.chance - a.chance);

    const lead = channels[0];

    stops.push({
      map,
      arrivesAt,
      chance: best.chance,
      stateAtArrival: lead?.state ?? "unknown",
      opensAt: lead?.timer.opensAt ?? null,
      closesAt: lead?.timer.closesAt ?? null,
      channels: channels.map(({ channel, chance, state }) => ({ channel, chance, state })),
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
