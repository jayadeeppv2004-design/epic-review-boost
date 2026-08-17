import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.googleReviewUrl === "string")
    data.googleReviewUrl = body.googleReviewUrl.trim();
  if (typeof body.placeId === "string") {
    const placeId = body.placeId.trim();
    data.placeId = placeId;
    // If a Place ID is provided and no explicit URL, derive the write-review link.
    if (placeId && typeof body.googleReviewUrl !== "string") {
      data.googleReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
    }
  }
  if (typeof body.name === "string") data.name = body.name.trim();

  const showroom = await prisma.showroom.update({ where: { id: params.id }, data });
  return NextResponse.json({ showroom });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Refuse to delete a showroom that still has employees, to avoid silently
  // wiping staff + their scan history via the FK cascade.
  const employees = await prisma.employee.count({ where: { showroomId: params.id } });
  if (employees > 0) {
    return NextResponse.json(
      { error: `Move or remove its ${employees} employee(s) first.` },
      { status: 409 }
    );
  }

  await prisma.showroom.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
