import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

// PRD §5.6 / §6.4 — record the official Google review total per showroom
// to calibrate scan-trends against real review growth.
export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const showroomId = String(body.showroomId || "");
  const reviewCount = Number(body.reviewCount);
  const avgRating = body.avgRating != null ? Number(body.avgRating) : null;

  if (!showroomId || Number.isNaN(reviewCount)) {
    return NextResponse.json({ error: "showroomId and reviewCount required" }, { status: 400 });
  }

  const snapshot = await prisma.reviewSnapshot.create({
    data: { showroomId, reviewCount, avgRating: avgRating ?? undefined },
  });
  return NextResponse.json({ snapshot }, { status: 201 });
}

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const snapshots = await prisma.reviewSnapshot.findMany({
    orderBy: { recordedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ snapshots });
}
