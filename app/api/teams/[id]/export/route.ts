import { prisma } from "@/lib/db";
import { exportShowdownTeam } from "@/lib/showdown";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: { id: string } };

// GET /api/teams/:id/export — Export team in Pokémon Showdown format
export async function GET(_req: NextRequest, { params }: Params) {
  const teamId = parseInt(params.id);
  if (isNaN(teamId)) return NextResponse.json({ error: "invalid team id" }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { pokemon: { orderBy: { slot: "asc" } } },
  });

  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const paste = exportShowdownTeam(team.pokemon);
  return NextResponse.json({ teamName: team.name, paste });
}
