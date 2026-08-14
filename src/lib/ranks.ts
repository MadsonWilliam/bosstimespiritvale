/**
 * Purely cosmetic reputation. No gameplay effect, no real-world meaning —
 * it exists so people who feed the board get visible credit for it.
 *
 * The curve is deliberately brutal. A community tracker collects a lot of
 * reports and some of them will be junk or padding, so a title that arrives
 * quickly is worth nothing. Level 150 sits at roughly half a million points —
 * tens of thousands of genuine reports — and is meant to stay unreached for a
 * very long time.
 */

export const POINTS = {
  /** Reported a boss death, starting a fresh timer. */
  kill: 10,
  /** Reported a summoned-boss kill (same timer reset). */
  summon: 10,
  /** Confirmed the tombstone is still there / already gone. */
  sighting: 4,
  /** First person to pin a map's tombstone location. */
  pin: 15,
  /** Confirmed someone else's pin. */
  pinConfirm: 3,
} as const;

export type PointReason = keyof typeof POINTS;

export type Rank = {
  id: string;
  minPoints: number;
  pt: string;
  en: string;
  /** Badge accent. */
  color: string;
};

/**
 * Imperial court titles. Deliberately flavourful and deliberately meaningless.
 */
export const RANKS: Rank[] = [
  { id: "wayfarer", minPoints: 0, pt: "Andarilho", en: "Wayfarer", color: "#8b8b95" },
  { id: "scout", minPoints: 100, pt: "Batedor", en: "Scout", color: "#7dd3fc" },
  { id: "sentinel", minPoints: 400, pt: "Sentinela", en: "Sentinel", color: "#4ade80" },
  { id: "tomb-warden", minPoints: 1000, pt: "Vigia da Lápide", en: "Tomb Warden", color: "#34d399" },
  { id: "vale-knight", minPoints: 2500, pt: "Cavaleiro do Vale", en: "Vale Knight", color: "#60a5fa" },
  { id: "twilight-baron", minPoints: 5000, pt: "Barão do Crepúsculo", en: "Twilight Baron", color: "#a78bfa" },
  { id: "spectral-count", minPoints: 10000, pt: "Conde Espectral", en: "Spectral Count", color: "#c084fc" },
  { id: "mist-marquis", minPoints: 20000, pt: "Marquês das Brumas", en: "Marquis of Mists", color: "#e879f9" },
  { id: "abyss-duke", minPoints: 40000, pt: "Duque do Abismo", en: "Abyss Duke", color: "#fb7185" },
  { id: "archduke", minPoints: 75000, pt: "Arquiduque Imperial", en: "Imperial Archduke", color: "#fb923c" },
  { id: "viceroy", minPoints: 150000, pt: "Vice-Rei de Nevaris", en: "Viceroy of Nevaris", color: "#fbbf24" },
  { id: "emperor", minPoints: 300000, pt: "Imperador do Vale", en: "Vale Emperor", color: "#fde047" },
];

/**
 * Nicks that carry a fixed honorary title regardless of score. Keyed by the
 * lowercased nick, matching how `nick_key` is stored.
 */
export const FOUNDERS: Record<string, Rank> = {
  frizo: {
    id: "founder",
    minPoints: 0,
    pt: "Founder · Rei Testador",
    en: "Founder · Test King",
    color: "#fde047",
  },
};

export function rankFor(points: number, nick?: string | null): Rank {
  const founder = nick ? FOUNDERS[nick.trim().toLowerCase()] : undefined;
  if (founder) return founder;

  let current = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.minPoints) current = r;
    else break;
  }
  return current;
}

export function nextRank(points: number, nick?: string | null): Rank | null {
  // Honorary titles do not progress — there is nothing above Founder.
  if (nick && FOUNDERS[nick.trim().toLowerCase()]) return null;
  return RANKS.find((r) => r.minPoints > points) ?? null;
}

/**
 * Points needed to reach a level. Quadratic, scaled so level 150 lands near
 * 500k points: `points = (level - 1)^2 * LEVEL_SCALE`.
 */
const LEVEL_SCALE = 22.5;
const MAX_LEVEL = 150;

export function levelFor(points: number): number {
  if (points <= 0) return 1;
  return Math.min(MAX_LEVEL, Math.floor(Math.sqrt(points / LEVEL_SCALE)) + 1);
}

const pointsForLevel = (level: number) => Math.pow(level - 1, 2) * LEVEL_SCALE;

/** Progress (0..1) towards the next level, for the XP bar. */
export function levelProgress(points: number): number {
  const lvl = levelFor(points);
  if (lvl >= MAX_LEVEL) return 1;
  const from = pointsForLevel(lvl);
  const to = pointsForLevel(lvl + 1);
  if (to <= from) return 1;
  return Math.max(0, Math.min(1, (points - from) / (to - from)));
}

/** Points still needed for the next level — shown so the grind is honest. */
export function pointsToNextLevel(points: number): number | null {
  const lvl = levelFor(points);
  if (lvl >= MAX_LEVEL) return null;
  return Math.max(0, Math.ceil(pointsForLevel(lvl + 1) - points));
}
