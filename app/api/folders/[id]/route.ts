import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/folders/:id — Get a folder with its teams
export async function GET(_req: NextRequest, { params }: Params) {
  const id = parseInt((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { teams: { include: { pokemon: true }, orderBy: { createdAt: "desc" } } },
  });

  if (!folder) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(folder);
}

// PATCH /api/folders/:id — Rename a folder
export async function PATCH(req: NextRequest, { params }: Params) {
  const id = parseInt((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: { name: name.trim() },
  });
  return NextResponse.json(folder);
}

// DELETE /api/folders/:id — Delete a folder (cascades to teams & pokemon)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const id = parseInt((await params).id);
  if (isNaN(id)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
