import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/teams — List all teams
export async function GET() {
  const teams = await prisma.team.findMany({
    include: { folder: true, pokemon: { orderBy: { slot: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teams);
}

// POST /api/teams — Create a team
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, folderId } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!folderId || typeof folderId !== "number") {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) {
    return NextResponse.json({ error: "folder not found" }, { status: 404 });
  }

  const team = await prisma.team.create({
    data: { name: name.trim(), folderId },
    include: { pokemon: true },
  });
  return NextResponse.json(team, { status: 201 });
}
