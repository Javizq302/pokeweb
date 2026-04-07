// Pokémon type effectiveness chart (Gen 6+)

export const ALL_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokemonType = (typeof ALL_TYPES)[number];

// TYPE_CHART[attacker][defender] = multiplier
// Only store non-1x values; default is 1x
const SUPER: Record<string, string[]> = {
  normal: [],
  fire: ["grass", "ice", "bug", "steel"],
  water: ["fire", "ground", "rock"],
  electric: ["water", "flying"],
  grass: ["water", "ground", "rock"],
  ice: ["grass", "ground", "flying", "dragon"],
  fighting: ["normal", "ice", "rock", "dark", "steel"],
  poison: ["grass", "fairy"],
  ground: ["fire", "electric", "poison", "rock", "steel"],
  flying: ["grass", "fighting", "bug"],
  psychic: ["fighting", "poison"],
  bug: ["grass", "psychic", "dark"],
  rock: ["fire", "ice", "flying", "bug"],
  ghost: ["psychic", "ghost"],
  dragon: ["dragon"],
  dark: ["psychic", "ghost"],
  steel: ["ice", "rock", "fairy"],
  fairy: ["fighting", "dragon", "dark"],
};

const NOT_VERY: Record<string, string[]> = {
  normal: ["rock", "steel"],
  fire: ["fire", "water", "rock", "dragon"],
  water: ["water", "grass", "dragon"],
  electric: ["electric", "grass", "dragon"],
  grass: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  ice: ["fire", "water", "ice", "steel"],
  fighting: ["poison", "flying", "psychic", "bug", "fairy"],
  poison: ["poison", "ground", "rock", "ghost"],
  ground: ["grass", "bug"],
  flying: ["electric", "rock", "steel"],
  psychic: ["psychic", "steel"],
  bug: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  rock: ["fighting", "ground", "steel"],
  ghost: ["dark"],
  dragon: ["steel"],
  dark: ["fighting", "dark", "fairy"],
  steel: ["fire", "water", "electric", "steel"],
  fairy: ["fire", "poison", "steel"],
};

const IMMUNE: Record<string, string[]> = {
  normal: ["ghost"],
  electric: ["ground"],
  fighting: ["ghost"],
  poison: ["steel"],
  ground: ["flying"],
  psychic: ["dark"],
  ghost: ["normal"],
  dragon: ["fairy"],
};

/**
 * Get the effectiveness multiplier of attackType vs defenseType.
 */
export function getEffectiveness(attackType: string, defenseType: string): number {
  if (IMMUNE[attackType]?.includes(defenseType)) return 0;
  if (SUPER[attackType]?.includes(defenseType)) return 2;
  if (NOT_VERY[attackType]?.includes(defenseType)) return 0.5;
  return 1;
}

/**
 * Get effectiveness of attackType vs a pokemon with one or two defense types.
 */
export function getMatchup(attackType: string, defenseTypes: string[]): number {
  return defenseTypes.reduce((mult, dt) => mult * getEffectiveness(attackType, dt), 1);
}

/**
 * For a defending type combination, get multipliers for all attacking types.
 */
export function getDefensiveMatchups(defenseTypes: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const atk of ALL_TYPES) {
    result[atk] = getMatchup(atk, defenseTypes);
  }
  return result;
}

/**
 * For an attacking type, get multipliers against all defending types.
 */
export function getOffensiveMatchups(attackType: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const def of ALL_TYPES) {
    result[def] = getEffectiveness(attackType, def);
  }
  return result;
}

/**
 * Group types by their multiplier value.
 */
export function groupByEffectiveness(matchups: Record<string, number>): Record<number, string[]> {
  const groups: Record<number, string[]> = {};
  for (const [type, mult] of Object.entries(matchups)) {
    if (!groups[mult]) groups[mult] = [];
    groups[mult].push(type);
  }
  return groups;
}

/**
 * Analyze a full team's defensive coverage.
 * Returns per-type how many pokemon are weak/resistant/immune.
 */
export function analyzeTeamDefense(
  teamTypes: string[][]
): Record<string, { weakCount: number; resistCount: number; immuneCount: number }> {
  const result: Record<string, { weakCount: number; resistCount: number; immuneCount: number }> = {};
  for (const atk of ALL_TYPES) {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;
    for (const defTypes of teamTypes) {
      const mult = getMatchup(atk, defTypes);
      if (mult === 0) immuneCount++;
      else if (mult > 1) weakCount++;
      else if (mult < 1) resistCount++;
    }
    result[atk] = { weakCount, resistCount, immuneCount };
  }
  return result;
}

/**
 * Analyze a full team's offensive coverage.
 * For each defending type, find the best multiplier any team move type can achieve.
 */
export function analyzeTeamOffense(
  teamMoveTypes: string[][]
): Record<string, { bestMult: number; coveredBy: number }> {
  const result: Record<string, { bestMult: number; coveredBy: number }> = {};
  for (const def of ALL_TYPES) {
    let bestMult = 0;
    let coveredBy = 0;
    for (const moveTypes of teamMoveTypes) {
      for (const atk of moveTypes) {
        const mult = getEffectiveness(atk, def);
        if (mult > bestMult) bestMult = mult;
        if (mult > 1) { coveredBy++; break; }
      }
    }
    result[def] = { bestMult, coveredBy };
  }
  return result;
}

// Display name (capitalize first letter)
export function typeDisplayName(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Color map for type badges (Tailwind classes)
export const TYPE_COLORS: Record<string, string> = {
  normal: "bg-[#A8A878]",
  fire: "bg-[#F08030]",
  water: "bg-[#6890F0]",
  electric: "bg-[#F8D030]",
  grass: "bg-[#78C850]",
  ice: "bg-[#98D8D8]",
  fighting: "bg-[#C03028]",
  poison: "bg-[#A040A0]",
  ground: "bg-[#E0C068]",
  flying: "bg-[#A890F0]",
  psychic: "bg-[#F85888]",
  bug: "bg-[#A8B820]",
  rock: "bg-[#B8A038]",
  ghost: "bg-[#705898]",
  dragon: "bg-[#7038F8]",
  dark: "bg-[#705848]",
  steel: "bg-[#B8B8D0]",
  fairy: "bg-[#EE99AC]",
};

// Raw hex color map for inline styles
export const TYPE_HEX_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};
