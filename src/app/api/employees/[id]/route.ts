import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.phone === "string") data.phone = body.phone.replace(/[^0-9]/g, "");
  if (typeof body.showroomId === "string") data.showroomId = body.showroomId;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const employee = await prisma.employee.update({
    where: { id: params.id },
    data,
    include: { showroom: true },
  });
  return NextResponse.json({ employee });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await prisma.employee.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
