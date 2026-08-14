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
 * How long past the top of the window we keep showing a timer before calling
 * it unreliable. Past this the boss was almost certainly killed without anyone
 * reporting it, which is extremely common.
 */
export const STALE_AFTER_MS = 45 * 60 * 1000;

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

/**
 * Coarse world regions, used by the route planner to prefer bosses that sit
 * close to each other. This layout is a community best guess — correct the
 * `region` and `neighbors` fields as the real map connections are confirmed.
 */
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
  /** Slugs reachable in roughly one hop. Used to score route continuity. */
  neighbors: string[];
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
    neighbors: ["bunny-woods", "forgotten-depths-1"],
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
    neighbors: ["sunny-meadows-2", "festering-woods-2", "forgotten-depths-1"],
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
    neighbors: ["bunny-woods", "windy-desert", "forgotten-depths-2"],
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
    neighbors: ["festering-woods-2", "windy-desert-north", "windy-desert-south"],
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
    neighbors: ["windy-desert-north", "mystic-lake-2"],
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
    neighbors: ["windy-desert", "fairy-glen"],
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
    neighbors: ["windy-desert"],
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
    // Bridges the early-game side of the world to the swamp side; without an
    // edge like this the graph splits in two and every long hop scores alike.
    neighbors: ["fairy-glen", "goblin-village", "swamp-wilderness"],
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
    neighbors: ["sunny-meadows-2", "bunny-woods", "forgotten-depths-2"],
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
    neighbors: ["forgotten-depths-1", "festering-woods-2"],
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
    neighbors: ["mystic-lake-2", "goblin-cave-2", "goblin-warcamp"],
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
    neighbors: ["goblin-village", "goblin-warcamp", "underground-cavern"],
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
    neighbors: ["underground-cavern", "crystal-cave", "mystic-lake-2"],
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
    neighbors: ["swamp-wilderness", "starfall-tundra"],
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
    neighbors: ["night-garden", "underground-cavern"],
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
    neighbors: ["swamp-wilderness", "sanctum-of-light", "demon-s-maw", "goblin-cave-2"],
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
    neighbors: ["underground-cavern", "the-forge", "abyss-castle-crypt"],
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
    neighbors: ["turtle-nexus", "starfall-tundra"],
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
    neighbors: ["abyss-castle-library", "demon-s-maw"],
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
    neighbors: ["abyss-castle-crypt", "the-echoing-spire"],
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
    neighbors: ["goblin-cave-2", "goblin-village"],
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
    neighbors: ["sanctum-of-light", "the-echoing-spire"],
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
    neighbors: ["demon-s-maw", "the-echoing-spire"],
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
    neighbors: ["crystal-cave", "sunken-depths"],
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
    neighbors: ["sunken-depths"],
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
    neighbors: ["abyss-castle-library", "the-forge", "night-garden"],
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

/**
 * Shortest hop distance between two maps. The cap only exists to bound the
 * search; it sits above the graph's real diameter so genuine distances are
 * never flattened into a tie.
 */
const MAX_HOPS = 14;

const hopCache = new Map<string, number>();

export function hopsBetween(from: string, to: string): number {
  if (from === to) return 0;
  const key = `${from}>${to}`;
  const cached = hopCache.get(key);
  if (cached !== undefined) return cached;

  const seen = new Set([from]);
  let frontier = [from];
  for (let depth = 1; depth <= MAX_HOPS; depth++) {
    const next: string[] = [];
    for (const slug of frontier) {
      for (const n of MAP_BY_SLUG.get(slug)?.neighbors ?? []) {
        if (seen.has(n)) continue;
        if (n === to) {
          hopCache.set(key, depth);
          return depth;
        }
        seen.add(n);
        next.push(n);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  hopCache.set(key, MAX_HOPS + 1);
  return MAX_HOPS + 1;
}
