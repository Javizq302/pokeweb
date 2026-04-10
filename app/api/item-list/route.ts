import { NextResponse } from "next/server";

const POKEAPI_BASE = process.env.NEXT_PUBLIC_POKEAPI_URL || "https://pokeapi.co/api/v2";

let cachedList: { name: string; sprite: string }[] | null = null;

export async function GET() {
  if (cachedList) {
    return NextResponse.json(cachedList);
  }

  try {
    const res = await fetch(`${POKEAPI_BASE}/item?limit=2100&offset=0`, {
      next: { revalidate: 86400 },
    });
    const data = await res.json();

    cachedList = data.results.map(
      (p: { name: string; url: string }) => ({
        name: p.name,
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${p.name}.png`,
      })
    );

    return NextResponse.json(cachedList);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
