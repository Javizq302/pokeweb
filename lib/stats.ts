// Pokémon stat calculation (Gen 3+ formula)

export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

// PokeAPI stat names → our keys
export const POKEAPI_STAT_MAP: Record<string, StatKey> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

// Nature modifiers: [boosted, lowered]
const NATURE_MODIFIERS: Record<string, [StatKey, StatKey]> = {
  Adamant: ["atk", "spa"],
  Bold: ["def", "atk"],
  Brave: ["atk", "spe"],
  Calm: ["spd", "atk"],
  Careful: ["spd", "spa"],
  Gentle: ["spd", "def"],
  Hasty: ["spe", "def"],
  Impish: ["def", "spa"],
  Jolly: ["spe", "spa"],
  Lax: ["def", "spd"],
  Lonely: ["atk", "def"],
  Mild: ["spa", "def"],
  Modest: ["spa", "atk"],
  Naive: ["spe", "spd"],
  Naughty: ["atk", "spd"],
  Quiet: ["spa", "spe"],
  Rash: ["spa", "spd"],
  Relaxed: ["def", "spe"],
  Sassy: ["spd", "spe"],
  Timid: ["spe", "atk"],
};

export const EV_TOTAL_CAP = 508;
export const EV_STAT_CAP = 252;

function getNatureMultiplier(nature: string | null, stat: StatKey): number {
  if (!nature || !(nature in NATURE_MODIFIERS)) return 1;
  const [boosted, lowered] = NATURE_MODIFIERS[nature];
  if (stat === boosted) return 1.1;
  if (stat === lowered) return 0.9;
  return 1;
}

export function calcStat(
  stat: StatKey,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: string | null,
): number {
  if (stat === "hp") {
    // Shedinja exception
    if (base === 1) return 1;
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * getNatureMultiplier(nature, stat));
}

export function calcAllStats(
  baseStats: Record<string, number>,
  evs: Record<string, number>,
  ivs: Record<string, number>,
  level: number,
  nature: string | null,
): Record<StatKey, number> {
  const result = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) {
    result[key] = calcStat(key, baseStats[key] ?? 0, ivs[key] ?? 31, evs[key] ?? 0, level, nature);
  }
  return result;
}

export function getTotalEvs(evs: Record<string, number>): number {
  return STAT_KEYS.reduce((sum, key) => sum + (evs[key] ?? 0), 0);
}

export function getNatureInfo(nature: string | null): { boosted: StatKey | null; lowered: StatKey | null } {
  if (!nature || !(nature in NATURE_MODIFIERS)) return { boosted: null, lowered: null };
  const [boosted, lowered] = NATURE_MODIFIERS[nature];
  return { boosted, lowered };
}
