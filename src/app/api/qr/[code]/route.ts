import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePosterPng } from "@/lib/poster";

export const dynamic = "force-dynamic";

// Returns the employee's 9:16 review poster as a PNG (PRD §5.3).
// Public so the image can be opened/downloaded/shared to WhatsApp.
// ?download=1 forces a file download.
export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const employee = await prisma.employee.findUnique({
    where: { employeeCode: params.code },
    include: { showroom: true },
  });
  if (!employee) return NextResponse.json({ error: "not found" }, { status: 404 });

  const png = await generatePosterPng({
    name: employee.name,
    phone: employee.phone,
    showroom: employee.showroom.name,
    employeeCode: employee.employeeCode,
  });

  const download = new URL(req.url).searchParams.get("download");
  const filename = `EPIC-QR-${employee.name.replace(/\s+/g, "_")}.png`;

  return new NextResponse(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
