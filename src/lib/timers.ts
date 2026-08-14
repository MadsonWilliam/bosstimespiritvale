/**
 * Respawn maths.
 *
 * A boss reappears 60 minutes after its death at the earliest and 90 at the
 * latest — 60 guaranteed, then a 30-minute random window.
 *
 * Three different numbers come out of that, and mixing them up is what makes a
 * board confusing, so they are kept strictly apart:
 *
 *   progress    how far the clock has run, 0 at the death and 1 once the
 *               window closes. Monotonic, never goes down. This is what the
 *               timer board shows.
 *   spawnChance odds it has already popped: 0 before the window opens, 1 once
 *               the window has closed.
 *   aliveChance odds it is standing there *right now* — spawnChance minus the
 *               ones that already got killed. Only the route planner wants
 *               this, because only the route planner asks "is it worth going".
 */

import {
  RESPAWN_MAX_MS,
  RESPAWN_MIN_MS,
  STALE_AFTER_MS,
  type Channel,
} from "@/data/game";

export type BossState =
  /** No usable report for this channel. */
  | "unknown"
  /** Death known, still inside the guaranteed 60 minutes. */
  | "waiting"
  /** Inside the 30-minute random window — it may pop at any moment. */
  | "window"
  /** Someone confirmed the tombstone is gone: it is up. */
  | "alive"
  /** Past the window with no news — very likely killed and not reported. */
  | "overdue"
  /** So far past the window the timer is meaningless. */
  | "stale";

export type DeathReport = {
  diedAt: number;
  source: "kill" | "summon";
  reporter: string | null;
  /** Reporter score, so the UI can show the title they earned. */
  reporterPoints: number | null;
};

export type Sighting = {
  seenAt: number;
  reporterPoints?: number | null;
  /** true = tombstone still there (not spawned), false = tombstone gone (spawned). */
  tombPresent: boolean;
  reporter: string | null;
};

export type ChannelTimer = {
  channel: Channel;
  state: BossState;
  /** Earliest possible spawn, ms epoch. Null when no death is known. */
  opensAt: number | null;
  /** Latest possible spawn, ms epoch. Null when no death is known. */
  closesAt: number | null;
  /** The death the window is measured from. */
  startedAt: number | null;
  lastDeath: DeathReport | null;
  lastSighting: Sighting | null;
  /** 0..1 clock progress from death to window close. Null without a death. */
  progress: number | null;
  /** 0..1 odds it has already spawned by now. */
  spawnChance: number;
  /** 0..1 odds a boss is standing on this channel right now. */
  chance: number;
};

/**
 * Mean time a world boss survives once it pops. Used to decay the odds after
 * the spawn window opens; tuned by feel, not by data, so it is a single knob.
 */
const SURVIVAL_TAU_MS = 20 * 60 * 1000;

/** Where the window opens along the progress bar — 60/90 of the way. */
export const WINDOW_OPEN_FRACTION = RESPAWN_MIN_MS / RESPAWN_MAX_MS;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Odds the boss has already spawned by `at`, assuming a uniform spawn moment. */
function spawnChanceAt(opensAt: number, closesAt: number, at: number): number {
  if (at <= opensAt) return 0;
  if (at >= closesAt) return 1;
  return clamp01((at - opensAt) / (closesAt - opensAt));
}

/**
 * Odds the boss is alive at `at`: the uniform spawn density integrated against
 * exponential survival. Closed form, so it is cheap enough to call per map per
 * tick.
 */
function aliveChanceAt(opensAt: number, closesAt: number, at: number): number {
  const w = closesAt - opensAt;
  if (w <= 0) return 0;
  if (at <= opensAt) return 0;

  const tau = SURVIVAL_TAU_MS;
  const upper = Math.min(at, closesAt);
  const integral =
    (tau / w) * (Math.exp(-(at - upper) / tau) - Math.exp(-(at - opensAt) / tau));
  return clamp01(integral);
}

/** Decay applied to a boss confirmed up at `seenAt`. */
const sightingDecay = (seenAt: number, at: number) =>
  clamp01(Math.exp(-(at - seenAt) / SURVIVAL_TAU_MS));

export function computeChannelTimer(
  channel: Channel,
  lastDeath: DeathReport | null,
  lastSighting: Sighting | null,
  at: number = Date.now(),
): ChannelTimer {
  const base: ChannelTimer = {
    channel,
    state: "unknown",
    opensAt: null,
    closesAt: null,
    startedAt: null,
    lastDeath,
    lastSighting,
    progress: null,
    spawnChance: 0,
    chance: 0,
  };

  // A sighting older than the last death tells us nothing new.
  const sighting =
    lastSighting && (!lastDeath || lastSighting.seenAt >= lastDeath.diedAt)
      ? lastSighting
      : null;

  if (!lastDeath) {
    if (sighting && !sighting.tombPresent) {
      // Tombstone gone and we never saw it die — treat as up, decaying.
      return {
        ...base,
        state: "alive",
        progress: 1,
        spawnChance: 1,
        chance: sightingDecay(sighting.seenAt, at),
      };
    }
    if (sighting && sighting.tombPresent) {
      // Tombstone confirmed present: definitely not up, but no ETA at all.
      return { ...base, state: "waiting" };
    }
    return base;
  }

  const startedAt = lastDeath.diedAt;
  let opensAt = startedAt + RESPAWN_MIN_MS;
  const closesAt = startedAt + RESPAWN_MAX_MS;

  // Progress always tracks the real clock since the death, so the bar never
  // jumps backwards when a sighting narrows the window.
  const progress = clamp01((at - startedAt) / (closesAt - startedAt));

  if (sighting) {
    if (!sighting.tombPresent && sighting.seenAt >= opensAt) {
      // Hard evidence it popped.
      return {
        ...base,
        state: "alive",
        opensAt,
        closesAt,
        startedAt,
        progress,
        spawnChance: 1,
        chance: sightingDecay(sighting.seenAt, at),
      };
    }
    if (sighting.tombPresent) {
      // Still not up as of `seenAt` — the remaining window starts there.
      opensAt = Math.max(opensAt, Math.min(sighting.seenAt, closesAt));
    }
  }

  let state: BossState;
  if (at < opensAt) state = "waiting";
  else if (at <= closesAt) state = "window";
  else if (at <= closesAt + STALE_AFTER_MS) state = "overdue";
  else state = "stale";

  return {
    ...base,
    state,
    opensAt,
    closesAt,
    startedAt,
    progress,
    spawnChance: spawnChanceAt(opensAt, closesAt, at),
    chance: aliveChanceAt(opensAt, closesAt, at),
  };
}

/** Odds this channel has a boss up at an arbitrary (often future) instant. */
export function channelChanceAt(t: ChannelTimer, at: number): number {
  if (t.state === "alive" && t.lastSighting) {
    return sightingDecay(t.lastSighting.seenAt, at);
  }
  if (t.opensAt === null || t.closesAt === null) return 0;
  return aliveChanceAt(t.opensAt, t.closesAt, at);
}

/** Odds at least one of a map's channels has a boss up at `at`. */
export function mapChanceAt(timers: ChannelTimer[], at: number): number {
  const noneUp = timers.reduce((acc, t) => acc * (1 - channelChanceAt(t, at)), 1);
  return clamp01(1 - noneUp);
}

/**
 * Board ordering. Confirmed kills come first, then everything with a running
 * clock sorted by how close it is to popping — which naturally puts the
 * 30-minute window above the guaranteed 60. Expired channels sink below all of
 * them: they are a "nobody reported this" notice, not something to plan around.
 */
const GROUP: Record<BossState, number> = {
  alive: 0,
  window: 1,
  waiting: 1,
  overdue: 2,
  stale: 3,
  unknown: 4,
};

export function compareTimers(a: ChannelTimer, b: ChannelTimer): number {
  const g = GROUP[a.state] - GROUP[b.state];
  if (g !== 0) return g;
  // Within a group, the one further along the clock is the more urgent one.
  return (b.progress ?? 0) - (a.progress ?? 0);
}

/** "1h 04m" / "12m 30s" — compact and stable in width. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}
