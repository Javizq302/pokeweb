import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: { id: string } };

// POST /api/teams/:id/pokemon — Add or update a pokemon in a team slot
export async function POST(req: NextRequest, { params }: Params) {
  const teamId = parseInt(params.id);
  if (isNaN(teamId)) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

  const body = await req.json();
  const { pokemonName, slot, nickname, item, ability, level, move1, move2, move3, move4, nature, teraType, evs, ivs } = body;

  if (!pokemonName || typeof pokemonName !== "string") {
    return NextResponse.json({ error: "pokemonName is required" }, { status: 400 });
  }
  if (!slot || typeof slot !== "number" || slot < 1 || slot > 6) {
    return NextResponse.json({ error: "slot must be 1-6" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const pokemon = await prisma.teamPokemon.upsert({
    where: { teamId_slot: { teamId, slot } },
    create: {
      teamId, pokemonName: pokemonName.toLowerCase(), slot,
      nickname, item, ability, level: level ?? 100, move1, move2, move3, move4, nature, teraType,
      evs: evs ? JSON.stringify(evs) : null,
      ivs: ivs ? JSON.stringify(ivs) : null,
    },
    update: {
      pokemonName: pokemonName.toLowerCase(),
      nickname, item, ability, level: level ?? 100, move1, move2, move3, move4, nature, teraType,
      evs: evs ? JSON.stringify(evs) : null,
      ivs: ivs ? JSON.stringify(ivs) : null,
    },
  });
  return NextResponse.json(pokemon, { status: 201 });
}

// DELETE /api/teams/:id/pokemon — Remove a pokemon from a slot
export async function DELETE(req: NextRequest, { params }: Params) {
  const teamId = parseInt(params.id);
  if (isNaN(teamId)) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const slot = parseInt(searchParams.get("slot") || "");
  if (isNaN(slot) || slot < 1 || slot > 6) {
    return NextResponse.json({ error: "slot query param must be 1-6" }, { status: 400 });
  }

  await prisma.teamPokemon.delete({
    where: { teamId_slot: { teamId, slot } },
  });
  return NextResponse.json({ deleted: true });
}
