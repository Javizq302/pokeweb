import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: { id: string } };

// GET /api/teams/:id — Get a team with pokemon
export async function GET(_req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { id },
    include: { folder: true, pokemon: { orderBy: { slot: "asc" } } },
  });

  if (!team) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(team);
}

// PATCH /api/teams/:id — Update team name or folder
export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json();
  const data: { name?: string; folderId?: number } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.folderId !== undefined) {
    if (typeof body.folderId !== "number") {
      return NextResponse.json({ error: "folderId must be a number" }, { status: 400 });
    }
    data.folderId = body.folderId;
  }

  const team = await prisma.team.update({
    where: { id },
    data,
    include: { pokemon: { orderBy: { slot: "asc" } } },
  });
  return NextResponse.json(team);
}

// DELETE /api/teams/:id — Delete a team
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
