import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ name: string }> };

const POKEAPI_BASE = process.env.NEXT_PUBLIC_POKEAPI_URL || "https://pokeapi.co/api/v2";

export async function GET(_req: NextRequest, { params }: Params) {
  const { name } = await params;
  const formattedName = name.toLowerCase().replace(/\s+/g, "-");

  let res = await fetch(`${POKEAPI_BASE}/pokemon/${formattedName}`, {
    next: { revalidate: 86400 },
  });

  // Si falla, intentar por la lista completa
  if (!res.ok) {
    const listRes = await fetch(
      `${POKEAPI_BASE}/pokemon?limit=100000&offset=0`,
      { next: { revalidate: 86400 } }
    );
    const listData = await listRes.json();
    const found = listData.results.find(
      (p: { name: string; url: string }) => p.name === formattedName
    );

    if (!found) {
      return NextResponse.json(
        { error: `Pokemon "${name}" not found` },
        { status: 404 }
      );
    }

    res = await fetch(found.url, { next: { revalidate: 86400 } });
  }

  // Este check y el return van FUERA del if, aplica para ambos casos
  if (!res.ok) {
    return NextResponse.json(
      { error: `Pokemon "${name}" not found` },
      { status: res.status }
    );
  }

  const data = await res.json();

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
      artwork: data.sprites.other?.["official-artwork"]?.front_default || null,
    },
    moves: data.moves.map((m: { move: { name: string } }) => m.move.name),
  });
}