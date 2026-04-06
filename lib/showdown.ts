// Pokémon Showdown import/export parser

export interface ShowdownPokemon {
  pokemonName: string;
  nickname: string | null;
  item: string | null;
  ability: string | null;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  nature: string | null;
  evs: Record<string, number> | null;
  ivs: Record<string, number> | null;
}

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const STAT_NAMES: Record<string, string> = {
  HP: "hp", Atk: "atk", Def: "def", SpA: "spa", SpD: "spd", Spe: "spe",
  hp: "hp", atk: "atk", def: "def", spa: "spa", spd: "spd", spe: "spe",
};

/**
 * Parse a Pokémon Showdown paste into an array of pokemon sets.
 * Each set is separated by a blank line.
 */
export function parseShowdownTeam(text: string): ShowdownPokemon[] {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks.filter((b) => b.trim()).map(parseShowdownBlock);
}

function parseShowdownBlock(block: string): ShowdownPokemon {
  const lines = block.trim().split("\n").map((l) => l.trim());

  let pokemonName = "";
  let nickname: string | null = null;
  let item: string | null = null;
  let ability: string | null = null;
  const moves: string[] = [];
  let nature: string | null = null;
  let evs: Record<string, number> | null = null;
  let ivs: Record<string, number> | null = null;

  // First line: "Nickname (Pokemon) @ Item" or "Pokemon @ Item"
  const firstLine = lines[0];
  const atSplit = firstLine.split(" @ ");
  const namePart = atSplit[0].trim();
  item = atSplit.length > 1 ? atSplit[1].trim() : null;

  const parenMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    nickname = parenMatch[1].trim();
    pokemonName = parenMatch[2].trim();
  } else {
    pokemonName = namePart;
  }

  // Remove gender suffix like (M) or (F)
  pokemonName = pokemonName.replace(/\s*\([MF]\)\s*$/, "").trim();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Ability:")) {
      ability = line.replace("Ability:", "").trim();
    } else if (line.startsWith("EVs:")) {
      evs = parseStats(line.replace("EVs:", ""));
    } else if (line.startsWith("IVs:")) {
      ivs = parseStats(line.replace("IVs:", ""));
    } else if (line.endsWith("Nature")) {
      nature = line.replace("Nature", "").trim();
    } else if (line.startsWith("- ")) {
      moves.push(line.replace("- ", "").trim());
    }
    // Skip lines like "Level:", "Shiny:", "Tera Type:", etc.
  }

  return {
    pokemonName,
    nickname: nickname || null,
    item: item || null,
    ability: ability || null,
    move1: moves[0] || null,
    move2: moves[1] || null,
    move3: moves[2] || null,
    move4: moves[3] || null,
    nature: nature || null,
    evs: evs || null,
    ivs: ivs || null,
  };
}

function parseStats(text: string): Record<string, number> {
  const stats: Record<string, number> = {};
  const parts = text.split("/").map((s) => s.trim());
  for (const part of parts) {
    const match = part.match(/^(\d+)\s+(\w+)$/);
    if (match) {
      const key = STAT_NAMES[match[2]];
      if (key) stats[key] = parseInt(match[1]);
    }
  }
  return stats;
}

/**
 * Export a pokemon set to Showdown format text.
 */
export function exportShowdownPokemon(p: {
  pokemonName: string;
  nickname?: string | null;
  item?: string | null;
  ability?: string | null;
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
  nature?: string | null;
  evs?: string | null;
  ivs?: string | null;
}): string {
  const lines: string[] = [];

  // Name line
  let nameLine = "";
  if (p.nickname) {
    nameLine = `${p.nickname} (${p.pokemonName})`;
  } else {
    nameLine = p.pokemonName;
  }
  if (p.item) nameLine += ` @ ${p.item}`;
  lines.push(nameLine);

  if (p.ability) lines.push(`Ability: ${p.ability}`);

  // EVs
  const evs = p.evs ? (typeof p.evs === "string" ? JSON.parse(p.evs) : p.evs) : null;
  if (evs) {
    const evParts = formatStats(evs);
    if (evParts) lines.push(`EVs: ${evParts}`);
  }

  if (p.nature) lines.push(`${p.nature} Nature`);

  // IVs
  const ivs = p.ivs ? (typeof p.ivs === "string" ? JSON.parse(p.ivs) : p.ivs) : null;
  if (ivs) {
    const ivParts = formatStats(ivs, 31);
    if (ivParts) lines.push(`IVs: ${ivParts}`);
  }

  const moves = [p.move1, p.move2, p.move3, p.move4].filter(Boolean);
  for (const move of moves) {
    lines.push(`- ${move}`);
  }

  return lines.join("\n");
}

const STAT_DISPLAY: Record<string, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

function formatStats(stats: Record<string, number>, defaultVal = 0): string {
  const parts: string[] = [];
  for (const key of STAT_KEYS) {
    const val = stats[key];
    if (val !== undefined && val !== defaultVal) {
      parts.push(`${val} ${STAT_DISPLAY[key]}`);
    }
  }
  return parts.join(" / ");
}

/**
 * Export an entire team to Showdown paste format.
 */
export function exportShowdownTeam(
  pokemon: Array<{
    pokemonName: string;
    nickname?: string | null;
    item?: string | null;
    ability?: string | null;
    move1?: string | null;
    move2?: string | null;
    move3?: string | null;
    move4?: string | null;
    nature?: string | null;
    evs?: string | null;
    ivs?: string | null;
  }>
): string {
  return pokemon.map(exportShowdownPokemon).join("\n\n");
}
