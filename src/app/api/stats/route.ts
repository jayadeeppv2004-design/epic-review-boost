import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const stats = await computeStats({
    range: url.searchParams.get("range"),
    showroomId: url.searchParams.get("showroomId"),
  });
  return NextResponse.json(stats);
}
