import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const showrooms = await prisma.showroom.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ showrooms });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const placeId = String(body.placeId || "").trim();
  let googleReviewUrl = String(body.googleReviewUrl || "").trim();

  if (!name) return NextResponse.json({ error: "Showroom name is required" }, { status: 400 });

  const dupe = await prisma.showroom.findFirst({ where: { name } });
  if (dupe) return NextResponse.json({ error: "A showroom with that name already exists" }, { status: 409 });

  // Derive the write-review link from a Place ID if no explicit URL was given.
  if (!googleReviewUrl && placeId) {
    googleReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
  }

  const showroom = await prisma.showroom.create({
    data: { name, placeId, googleReviewUrl },
  });
  return NextResponse.json({ showroom }, { status: 201 });
}
