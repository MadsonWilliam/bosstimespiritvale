/**
 * Respawn maths.
 *
 * A boss reappears somewhere between 60 and 90 minutes after its last death.
 * We never know the exact minute, so everything here is expressed as a window
 * plus a probability that the boss is standing there *right now*.
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
};

export type Sighting = {
  seenAt: number;
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
  lastDeath: DeathReport | null;
  lastSighting: Sighting | null;
  /** 0..1 — chance a boss is up on this channel at `at`. */
  chance: number;
};

/**
 * Mean time a world boss survives once it pops. Used to decay the odds after
 * the spawn window opens; tuned by feel, not by data, so it is a single knob.
 */
const SURVIVAL_TAU_MS = 20 * 60 * 1000;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Probability the boss is alive at `at`, assuming the spawn moment is uniform
 * across [opensAt, closesAt] and each spawned boss survives with a half-life
 * of SURVIVAL_TAU_MS.
 *
 * Integrating the uniform spawn density against exponential survival gives a
 * closed form, which keeps this cheap enough to call for every map on every
 * tick.
 */
function aliveChance(opensAt: number, closesAt: number, at: number): number {
  const w = closesAt - opensAt;
  if (w <= 0) return 0;
  if (at <= opensAt) return 0;

  const tau = SURVIVAL_TAU_MS;
  const upper = Math.min(at, closesAt);
  // ∫ from opensAt to upper of (1/w) · e^(-(at-s)/tau) ds
  const integral =
    (tau / w) *
    (Math.exp(-(at - upper) / tau) - Math.exp(-(at - opensAt) / tau));
  return clamp01(integral);
}

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
    lastDeath,
    lastSighting,
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
        chance: clamp01(Math.exp(-(at - sighting.seenAt) / SURVIVAL_TAU_MS)),
      };
    }
    if (sighting && sighting.tombPresent) {
      // Tombstone confirmed present: definitely not up, but no ETA at all.
      return { ...base, state: "waiting", chance: 0 };
    }
    return base;
  }

  let opensAt = lastDeath.diedAt + RESPAWN_MIN_MS;
  const closesAt = lastDeath.diedAt + RESPAWN_MAX_MS;

  if (sighting) {
    if (!sighting.tombPresent && sighting.seenAt >= opensAt) {
      // Hard evidence it popped.
      return {
        ...base,
        state: "alive",
        opensAt,
        closesAt,
        chance: clamp01(Math.exp(-(at - sighting.seenAt) / SURVIVAL_TAU_MS)),
      };
    }
    if (sighting.tombPresent) {
      // Still not up as of `seenAt` — the remaining window starts there.
      opensAt = Math.max(opensAt, sighting.seenAt);
    }
  }

  const chance = aliveChance(opensAt, closesAt, at);

  let state: BossState;
  if (at < opensAt) state = "waiting";
  else if (at <= closesAt) state = "window";
  else if (at <= closesAt + STALE_AFTER_MS) state = "overdue";
  else state = "stale";

  return { ...base, state, opensAt, closesAt, chance };
}

/** Chance that at least one of a map's channels has a boss up at `at`. */
export function mapChance(timers: ChannelTimer[], at: number): number {
  const product = timers.reduce((acc, t) => {
    const c =
      t.opensAt !== null && t.closesAt !== null && t.state !== "alive"
        ? aliveChance(t.opensAt, t.closesAt, at)
        : t.state === "alive" && t.lastSighting
          ? clamp01(Math.exp(-(at - t.lastSighting.seenAt) / SURVIVAL_TAU_MS))
          : 0;
    return acc * (1 - c);
  }, 1);
  return clamp01(1 - product);
}

/** Ordering used by the "deadline" board: most actionable first. */
const STATE_RANK: Record<BossState, number> = {
  alive: 0,
  window: 1,
  overdue: 2,
  waiting: 3,
  stale: 4,
  unknown: 5,
};

export function compareTimers(a: ChannelTimer, b: ChannelTimer): number {
  const r = STATE_RANK[a.state] - STATE_RANK[b.state];
  if (r !== 0) return r;
  if (a.state === "waiting" && b.state === "waiting") {
    return (a.opensAt ?? Infinity) - (b.opensAt ?? Infinity);
  }
  return b.chance - a.chance;
}

/** "1h 04m" / "12m 30s" / "agora" — compact and stable in width. */
export function formatDuration(ms: number, lang: "pt" | "en" = "pt"): string {
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return lang === "pt" ? `${s}s` : `${s}s`;
}
