/**
 * Static game data for SpiritVale.
 *
 * SpiritVale has no public API, so everything here is hand-maintained from
 * community knowledge. Editing this file is the intended way to add a boss,
 * fix a drop or correct the world layout — nothing else needs to change.
 */

export const SERVERS = ["SA", "NA", "EU", "SEA", "OCE"] as const;
export type ServerId = (typeof SERVERS)[number];

export const SERVER_LABELS: Record<ServerId, string> = {
  SA: "South America",
  NA: "North America",
  EU: "Europe",
  SEA: "Southeast Asia",
  OCE: "Oceania",
};

/** Channels a world boss can spawn in. */
export const CHANNELS = [1, 2, 3] as const;
export type Channel = (typeof CHANNELS)[number];

/** Respawn window measured from the last confirmed death. */
export const RESPAWN_MIN_MS = 60 * 60 * 1000; // 60 min guaranteed
export const RESPAWN_MAX_MS = 90 * 60 * 1000; // + up to 30 random min
export const RESPAWN_RANDOM_MS = RESPAWN_MAX_MS - RESPAWN_MIN_MS;

/**
 * Grace period after the window closes. For these few minutes the channel is
 * flagged red so people notice nobody reported the kill; after that it drops
 * off the board entirely rather than lingering as noise in the timers and the
 * route. A dead boss has no route.
 */
export const STALE_AFTER_MS = 3 * 60 * 1000;

export type Element =
  | "wind"
  | "neutral"
  | "shadow"
  | "holy"
  | "fire"
  | "earth"
  | "water"
  | "poison"
  | "undead"
  | "ghost";

export const ELEMENTS: Record<Element, { pt: string; en: string; color: string }> = {
  wind: { pt: "Vento", en: "Wind", color: "#7dd3fc" },
  neutral: { pt: "Neutro", en: "Neutral", color: "#d4d4d8" },
  shadow: { pt: "Sombra", en: "Shadow", color: "#a78bfa" },
  holy: { pt: "Sagrado", en: "Holy", color: "#fde68a" },
  fire: { pt: "Fogo", en: "Fire", color: "#fb923c" },
  earth: { pt: "Terra", en: "Earth", color: "#a3b18a" },
  water: { pt: "Água", en: "Water", color: "#60a5fa" },
  poison: { pt: "Veneno", en: "Poison", color: "#86efac" },
  undead: { pt: "Morto-vivo", en: "Undead", color: "#94a3b8" },
  ghost: { pt: "Fantasma", en: "Ghost", color: "#c4b5fd" },
};

/** Coarse world regions. Used only for grouping and search, not for routing. */
export type RegionId =
  | "meadowlands"
  | "desert"
  | "lakelands"
  | "swamp"
  | "frost"
  | "sanctum"
  | "abyss"
  | "sea";

export const REGIONS: Record<RegionId, { pt: string; en: string }> = {
  meadowlands: { pt: "Campos & Bosques", en: "Meadows & Woods" },
  desert: { pt: "Deserto", en: "Desert" },
  lakelands: { pt: "Lagos & Goblins", en: "Lakes & Goblins" },
  swamp: { pt: "Pântano & Cavernas", en: "Swamp & Caverns" },
  frost: { pt: "Gelo", en: "Frost" },
  sanctum: { pt: "Santuário", en: "Sanctum" },
  abyss: { pt: "Abismo & Forja", en: "Abyss & Forge" },
  sea: { pt: "Profundezas", en: "Deep Sea" },
};

export type BossMap = {
  /** URL-safe id; also the `public/minimaps/<slug>-full.webp` basename. */
  slug: string;
  name: string;
  region: RegionId;
  /**
   * How much effort it costs to reach this map and find the boss in it, from
   * 1 (trivial — teleport lands you on top of it) to 2 (long trek, no warp,
   * sprawling map). Community-calibrated; used only to weight route ordering,
   * never shown to visitors as a raw number.
   */
  difficulty: number;
  boss: {
    name: string;
    level: number;
    element: Element;
    drops: string[];
  } | null;
};

export const BOSS_MAPS: BossMap[] = [
  {
    slug: "sunny-meadows-2",
    name: "Sunny Meadows 2",
    region: "meadowlands",
    difficulty: 1,
    boss: {
      name: "Vespa",
      level: 15,
      element: "wind",
      drops: ["Vespa Card", "Tempo Gem"],
    },
  },
  {
    slug: "bunny-woods",
    name: "Bunny Woods",
    region: "meadowlands",
    difficulty: 1.3,
    boss: {
      name: "Vorpal Hare",
      level: 30,
      element: "neutral",
      drops: ["Vorpal Hare Card", "Stride Gem"],
    },
  },
  {
    slug: "festering-woods-2",
    name: "Festering Woods 2",
    region: "meadowlands",
    difficulty: 1.8,
    boss: {
      name: "Lycanthrope",
      level: 35,
      element: "shadow",
      drops: ["Lycanthrope Card", "Bloodfang Gem"],
    },
  },
  {
    slug: "windy-desert",
    name: "Windy Desert",
    region: "desert",
    difficulty: 1.6,
    boss: {
      name: "Raiju",
      level: 35,
      element: "wind",
      drops: ["Raiju Card", "Wind Gem"],
    },
  },
  {
    slug: "fairy-glen",
    name: "Fairy Glen",
    region: "desert",
    difficulty: 1.5,
    boss: {
      name: "Lady Fey",
      level: 40,
      element: "holy",
      drops: ["Lady Fey Card", "Grace Gem"],
    },
  },
  {
    slug: "windy-desert-north",
    name: "Windy Desert North",
    region: "desert",
    difficulty: 1.5,
    boss: {
      name: "Scorpion King",
      level: 40,
      element: "fire",
      drops: ["Scorpion King Card", "Fire Gem", "Precision Gem"],
    },
  },
  {
    slug: "windy-desert-south",
    name: "Windy Desert South",
    region: "desert",
    difficulty: 1.4,
    boss: {
      name: "Cactus King",
      level: 40,
      element: "earth",
      drops: ["Cactus King Card", "Spike Gem"],
    },
  },
  {
    slug: "mystic-lake-2",
    name: "Mystic Lake 2",
    region: "lakelands",
    difficulty: 1.2,
    boss: {
      name: "Hermit King",
      level: 45,
      element: "water",
      drops: ["Hermit King Card", "Water Gem"],
    },
  },
  {
    slug: "forgotten-depths-1",
    name: "Forgotten Depths 1",
    region: "meadowlands",
    difficulty: 1.3,
    boss: {
      name: "Naga",
      level: 50,
      element: "poison",
      drops: ["Naga Card", "Echo Gem", "Evasion Gem"],
    },
  },
  {
    slug: "forgotten-depths-2",
    name: "Forgotten Depths 2",
    region: "meadowlands",
    difficulty: 1.3,
    boss: {
      name: "Night Baron",
      level: 55,
      element: "poison",
      drops: ["Night Baron Card", "Soulfang Gem"],
    },
  },
  {
    slug: "goblin-village",
    name: "Goblin Village",
    region: "lakelands",
    difficulty: 1.1,
    boss: {
      name: "Orc King",
      level: 55,
      element: "earth",
      drops: ["Orc King Card", "Earth Gem"],
    },
  },
  {
    slug: "goblin-cave-2",
    name: "Goblin Cave 2",
    region: "lakelands",
    difficulty: 1.3,
    boss: {
      name: "Zombie Orc Lord",
      level: 65,
      element: "undead",
      drops: ["Zombie Orc Lord Card", "Bastion Gem"],
    },
  },
  {
    slug: "swamp-wilderness",
    name: "Swamp Wilderness",
    region: "swamp",
    difficulty: 1.1,
    boss: {
      name: "Broodmother",
      level: 75,
      element: "undead",
      drops: ["Broodmother Card", "Mind Gem"],
    },
  },
  {
    slug: "crystal-cave",
    name: "Crystal Cave",
    region: "frost",
    difficulty: 1.1,
    boss: {
      name: "Ice Mage",
      level: 80,
      element: "water",
      drops: ["Ice Mage Card", "Mirror Gem", "Ward Gem"],
    },
  },
  {
    slug: "sanctum-of-light",
    name: "Sanctum of Light",
    region: "sanctum",
    difficulty: 1.1,
    boss: {
      name: "Seraphim Arbiter",
      level: 90,
      element: "holy",
      drops: ["Seraphim Arbiter Card", "Holy Gem", "Channel Gem"],
    },
  },
  {
    slug: "underground-cavern",
    name: "Underground Cavern",
    region: "swamp",
    difficulty: 1.1,
    boss: {
      name: "Devourer",
      level: 95,
      element: "poison",
      drops: ["Devourer Card", "Poison Gem"],
    },
  },
  {
    slug: "demon-s-maw",
    name: "Demon's Maw",
    region: "abyss",
    difficulty: 1.1,
    boss: {
      name: "Demon Lord",
      level: 105,
      element: "fire",
      drops: ["Demon Lord Card", "Focus Gem", "Mantra Gem"],
    },
  },
  {
    slug: "sunken-depths",
    name: "Sunken Depths",
    region: "sea",
    difficulty: 1.3,
    boss: {
      name: "Kraken",
      level: 110,
      element: "water",
      drops: ["Kraken Card", "Gaze Gem"],
    },
  },
  {
    slug: "abyss-castle-crypt",
    name: "Abyss Castle Crypt",
    region: "abyss",
    difficulty: 1.4,
    boss: {
      name: "Wraith King",
      level: 125,
      element: "undead",
      drops: ["Wraith King Card", "Undead Gem"],
    },
  },
  {
    slug: "abyss-castle-library",
    name: "Abyss Castle Library",
    region: "abyss",
    difficulty: 1.4,
    boss: {
      name: "Abyss Archon",
      level: 130,
      element: "ghost",
      drops: ["Abyss Archon Card", "Shadow Gem", "Veil Gem"],
    },
  },
  {
    slug: "goblin-warcamp",
    name: "Goblin Warcamp",
    region: "lakelands",
    difficulty: 1.1,
    boss: {
      name: "Orc Warchief",
      level: 130,
      element: "wind",
      drops: ["Orc Warchief Card", "Heart Gem", "Steadfast Gem"],
    },
  },
  {
    slug: "night-garden",
    name: "Night Garden",
    region: "sanctum",
    difficulty: 1.3,
    boss: {
      name: "Cosmic Entity",
      level: 135,
      element: "holy",
      drops: ["Cosmic Entity Card", "Vitalis Gem", "Seer Gem"],
    },
  },
  {
    slug: "the-forge",
    name: "The Forge",
    region: "abyss",
    difficulty: 1,
    boss: {
      name: "Suphara",
      level: 135,
      element: "shadow",
      drops: ["Suphara Card", "Razor Gem", "Anchor Gem"],
    },
  },
  {
    slug: "starfall-tundra",
    name: "Starfall Tundra",
    region: "frost",
    difficulty: 1.3,
    boss: {
      name: "Ice Titan",
      level: 140,
      element: "water",
      drops: ["Ice Titan Card", "Deflect Gem", "Carrier Gem"],
    },
  },
  {
    slug: "turtle-nexus",
    name: "Turtle Nexus",
    region: "sea",
    difficulty: 1.4,
    boss: {
      name: "Turtle Champion",
      level: 140,
      element: "earth",
      drops: ["Turtle Champion Card", "Overcharge Gem", "Tenacity Gem"],
    },
  },
  {
    slug: "the-echoing-spire",
    name: "The Echoing Spire",
    region: "abyss",
    difficulty: 1.5,
    // Boss still unconfirmed by the community.
    boss: null,
  },
];

/** Total maps in SpiritVale; only the 26 above hold a world boss. */
export const TOTAL_MAPS = 46;

export const MAP_BY_SLUG = new Map(BOSS_MAPS.map((m) => [m.slug, m]));

export function minimapUrl(slug: string): string {
  return `/minimaps/${slug}-full.webp`;
}
