import { NextRequest, NextResponse } from "next/server";

type Params = { params: { name: string } };

const POKEAPI_BASE = process.env.NEXT_PUBLIC_POKEAPI_URL || "https://pokeapi.co/api/v2";

// GET /api/pokemon/:name — Proxy to PokéAPI
export async function GET(_req: NextRequest, { params }: Params) {
  const { name } = params;

  const res = await fetch(`${POKEAPI_BASE}/pokemon/${name.toLowerCase()}`, {
    next: { revalidate: 86400 }, // Cache 24h
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Pokemon "${name}" not found` },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Return only the fields we need
  return NextResponse.json({
    id: data.id,
    name: data.name,
    types: data.types.map((t: { type: { name: string } }) => t.type.name),
    abilities: data.abilities.map(
      (a: { ability: { name: string }; is_hidden: boolean }) => ({
        name: a.ability.name,
        hidden: a.is_hidden,
      })
    ),
    stats: Object.fromEntries(
      data.stats.map((s: { stat: { name: string }; base_stat: number }) => [
        s.stat.name,
        s.base_stat,
      ])
    ),
    sprites: {
      front: data.sprites.front_default,
      front_shiny: data.sprites.front_shiny,
      artwork:
        data.sprites.other?.["official-artwork"]?.front_default || null,
    },
    moves: data.moves.map(
      (m: { move: { name: string } }) => m.move.name
    ),
  });
}
