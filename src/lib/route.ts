/**
 * Route planner.
 *
 * This is a ranking of the best targets right now, not a train timetable. An
 * earlier version scored every candidate at its projected arrival time and
 * dropped anything whose window would have closed by then — which quietly
 * deleted good bosses from the list the moment they passed their peak. Wrong:
 * as long as a window is open, the boss might still be standing there, and the
 * player is the one who decides whether to go. The route's job is to show the
 * top options in order, so nobody has to work it out themselves.
 *
 * Order:
 *   1. Anything up or inside its 30-minute window, best odds first. Odds peak
 *      15 minutes into the window and decay after, and a map with two live
 *      channels beats a map with one.
 *   2. Then the ones still counting down the guaranteed 60 minutes, soonest
 *      first — that is where you head next.
 *   3. Never anything already expired. A dead boss has no route.
 *
 * Difficulty barely registers: a light nudge for maps that are a pain to run,
 * never enough to move a target past one with better timing.
 */

import { BOSS_MAPS, type BossMap } from "@/data/game";
import {
  channelChanceAt,
  mapChanceAt,
  peakAt,
  type BossState,
  type ChannelTimer,
} from "@/lib/timers";

/** Rough minutes between stops, for the arrival estimate shown on each card. */
const BASE_MINUTES_PER_STOP = 4;
const DIFFICULTY_TRAVEL_MINUTES = 3;

/**
 * How much a full point of difficulty is worth. Tiny on purpose: 3% of the
 * odds for a live boss, three minutes for one still counting down. It settles
 * near-ties and nothing else.
 */
const DIFFICULTY_CHANCE_NUDGE = 0.03;
const DIFFICULTY_WAIT_MINUTES = 3;

const MS_PER_MIN = 60 * 1000;

export type RouteStop = {
  map: BossMap;
  /** Rough ms epoch you would arrive, walking the list in order. */
  arrivesAt: number;
  /** 0..1 chance at least one channel has a boss up right now. */
  chance: number;
  /** What the lead channel is doing now — drives the colour and the badge. */
  stateNow: BossState;
  /** The channel that makes this stop worth taking. */
  leadChannel: number;
  opensAt: number | null;
  closesAt: number | null;
  /** When this stop is at its best — 15 minutes into the window. */
  peakAt: number | null;
  channels: { channel: number; chance: number; state: BossState }[];
};

export type RouteInput = {
  timers: Record<string, ChannelTimer[]>;
  maxStops?: number;
  only?: string[] | null;
  now?: number;
};

/** States that still belong on a route. Expired ones never do. */
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

  const ranked = BOSS_MAPS.flatMap((map) => {
    if (!map.boss || !allowed.has(map.slug)) return [];
    const list = timers[map.slug] ?? [];

    const channels = list
      .map((t) => ({
        timer: t,
        channel: t.channel,
        chance: channelChanceAt(t, now),
        state: t.state,
      }))
      .filter((c) => ROUTABLE.includes(c.state))
      // Live channels first, then the ones still counting down.
      .sort((a, b) => tierOf(a.state) - tierOf(b.state) || b.chance - a.chance);

    const lead = channels[0];
    if (!lead) return [];

    const tier = tierOf(lead.state);
    const chance = mapChanceAt(list, now);
    const difficultyOver1 = map.difficulty - 1;

    /*
     * Tier 0 is ranked on the odds, tier 1 on how soon the first channel
     * opens. Both are negated into a single "higher is better" number, with
     * the wait scaled right down so it can never outrank a real chance.
     */
    const score =
      tier === 0
        ? chance - difficultyOver1 * DIFFICULTY_CHANCE_NUDGE
        : -(minutesUntilOpen(list, now) + difficultyOver1 * DIFFICULTY_WAIT_MINUTES) /
          10_000;

    return [{ map, list, channels, lead, tier, chance, score }];
  })
    .sort((a, b) => a.tier - b.tier || b.score - a.score)
    .slice(0, maxStops);

  // Arrival times are a hint about pacing, laid over the finished order —
  // they no longer decide who makes the list.
  let clock = now;
  return ranked.map(({ map, channels, lead, chance }) => {
    clock += (BASE_MINUTES_PER_STOP + (map.difficulty - 1) * DIFFICULTY_TRAVEL_MINUTES) * MS_PER_MIN;
    return {
      map,
      arrivesAt: clock,
      chance,
      stateNow: lead.state,
      leadChannel: lead.channel,
      opensAt: lead.timer.opensAt,
      closesAt: lead.timer.closesAt,
      peakAt: peakAt(lead.timer),
      channels: channels.map(({ channel, chance: c, state }) => ({
        channel,
        chance: c,
        state,
      })),
    };
  });
}

/** Minutes until the soonest channel of this map opens. */
function minutesUntilOpen(timers: ChannelTimer[], at: number): number {
  const waits = timers
    .filter((t) => t.opensAt !== null && t.opensAt > at)
    .map((t) => (t.opensAt! - at) / MS_PER_MIN);
  return waits.length ? Math.min(...waits) : 0;
}
