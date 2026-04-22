import { prisma } from "@/lib/db";
import { parseShowdownTeam } from "@/lib/showdown";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/teams/:id/import — Import Pokémon Showdown paste into a team
export async function POST(req: NextRequest, { params }: Params) {
  const teamId = parseInt((await params).id);
  if (isNaN(teamId)) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const { paste } = await req.json();
  if (!paste || typeof paste !== "string") {
    return NextResponse.json({ error: "paste is required" }, { status: 400 });
  }

  const parsed = parseShowdownTeam(paste);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "no pokemon found in paste" }, { status: 400 });
  }
  if (parsed.length > 6) {
    return NextResponse.json({ error: "max 6 pokemon per team" }, { status: 400 });
  }

  // Clear existing pokemon on the team
  await prisma.teamPokemon.deleteMany({ where: { teamId } });

  // Insert parsed pokemon
  const created = await Promise.all(
    parsed.map((p, i) =>
      prisma.teamPokemon.create({
        data: {
          teamId,
          pokemonName: p.pokemonName.toLowerCase(),
          slot: i + 1,
          nickname: p.nickname,
          item: p.item,
          ability: p.ability,
          level: p.level,
          move1: p.move1,
          move2: p.move2,
          move3: p.move3,
          move4: p.move4,
          nature: p.nature,
          teraType: p.teraType,
          evs: p.evs ? JSON.stringify(p.evs) : null,
          ivs: p.ivs ? JSON.stringify(p.ivs) : null,
        },
      })
    )
  );

  return NextResponse.json({ imported: created.length, pokemon: created }, { status: 201 });
}
