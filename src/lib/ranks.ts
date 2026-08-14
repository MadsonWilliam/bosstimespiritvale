/**
 * Purely cosmetic reputation. No gameplay effect, no real-world meaning —
 * it exists so people who feed the board get visible credit for it.
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
  /** Tailwind-ready accent used for the badge. */
  color: string;
};

/**
 * Imperial court titles. Deliberately flavourful and deliberately meaningless.
 */
export const RANKS: Rank[] = [
  { id: "wayfarer", minPoints: 0, pt: "Andarilho", en: "Wayfarer", color: "#8b8b95" },
  { id: "scout", minPoints: 25, pt: "Batedor", en: "Scout", color: "#7dd3fc" },
  { id: "sentinel", minPoints: 75, pt: "Sentinela", en: "Sentinel", color: "#4ade80" },
  { id: "tomb-warden", minPoints: 150, pt: "Vigia da Lápide", en: "Tomb Warden", color: "#34d399" },
  { id: "vale-knight", minPoints: 300, pt: "Cavaleiro do Vale", en: "Vale Knight", color: "#60a5fa" },
  { id: "twilight-baron", minPoints: 600, pt: "Barão do Crepúsculo", en: "Twilight Baron", color: "#a78bfa" },
  { id: "spectral-count", minPoints: 1000, pt: "Conde Espectral", en: "Spectral Count", color: "#c084fc" },
  { id: "mist-marquis", minPoints: 1600, pt: "Marquês das Brumas", en: "Marquis of Mists", color: "#e879f9" },
  { id: "abyss-duke", minPoints: 2500, pt: "Duque do Abismo", en: "Abyss Duke", color: "#fb7185" },
  { id: "archduke", minPoints: 4000, pt: "Arquiduque Imperial", en: "Imperial Archduke", color: "#fb923c" },
  { id: "viceroy", minPoints: 6000, pt: "Vice-Rei de Nevaris", en: "Viceroy of Nevaris", color: "#fbbf24" },
  { id: "emperor", minPoints: 10000, pt: "Imperador do Vale", en: "Vale Emperor", color: "#fde047" },
];

export function rankFor(points: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.minPoints) current = r;
    else break;
  }
  return current;
}

export function nextRank(points: number): Rank | null {
  return RANKS.find((r) => r.minPoints > points) ?? null;
}

/**
 * Fictional level, capped at 150 so it reads like a SpiritVale character sheet.
 * Square-root curve: fast early levels, long grind at the top.
 */
export function levelFor(points: number): number {
  if (points <= 0) return 1;
  return Math.min(150, Math.floor(Math.sqrt(points * 2.2)) + 1);
}

/** Progress (0..1) towards the next level, for the XP bar. */
export function levelProgress(points: number): number {
  const lvl = levelFor(points);
  if (lvl >= 150) return 1;
  const pointsAt = (l: number) => Math.pow(l - 1, 2) / 2.2;
  const from = pointsAt(lvl);
  const to = pointsAt(lvl + 1);
  if (to <= from) return 1;
  return Math.max(0, Math.min(1, (points - from) / (to - from)));
}
