import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { shortCode } from "@/lib/util";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const employees = await prisma.employee.findMany({
    include: { showroom: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ employees });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  const employeeId = String(body.employeeId || "").trim();
  const showroomId = String(body.showroomId || "").trim();

  if (!name || !phone || !employeeId || !showroomId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const showroom = await prisma.showroom.findUnique({ where: { id: showroomId } });
  if (!showroom) return NextResponse.json({ error: "Invalid showroom" }, { status: 400 });

  const dupe = await prisma.employee.findUnique({ where: { employeeId } });
  if (dupe) return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });

  // unique employeeCode (stable tracked-link slug)
  let code = shortCode();
  while (await prisma.employee.findUnique({ where: { employeeCode: code } })) code = shortCode();

  const employee = await prisma.employee.create({
    data: { name, phone, employeeId, showroomId, employeeCode: code },
    include: { showroom: true },
  });
  return NextResponse.json({ employee }, { status: 201 });
}
