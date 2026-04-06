import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/folders — List all folders (with teams count)
export async function GET() {
  const folders = await prisma.folder.findMany({
    include: { teams: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(folders);
}

// POST /api/folders — Create a folder
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({ data: { name: name.trim() } });
  return NextResponse.json(folder, { status: 201 });
}
