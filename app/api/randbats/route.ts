import { NextResponse } from "next/server";

// Cache the randbats data in memory
let cachedData: Record<string, unknown> | null = null;
let cacheTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function GET() {
  const now = Date.now();

  if (cachedData && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const res = await fetch(
      "https://pkmn.github.io/randbats/data/gen9randombattle.json",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Failed to fetch randbats data");
    const data = await res.json();
    cachedData = data;
    cacheTime = now;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch random battle data" },
      { status: 500 }
    );
  }
}
