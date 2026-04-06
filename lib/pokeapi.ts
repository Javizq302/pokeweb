// Helper to fetch Pokémon data from our internal proxy

export async function fetchPokemon(name: string) {
  const res = await fetch(`/api/pokemon/${name.toLowerCase()}`);
  if (!res.ok) throw new Error(`Pokemon "${name}" not found`);
  return res.json();
}

export interface PokemonData {
  id: number;
  name: string;
  types: string[];
  abilities: { name: string; hidden: boolean }[];
  stats: Record<string, number>;
  sprites: {
    front: string | null;
    front_shiny: string | null;
    artwork: string | null;
  };
  moves: string[];
}
