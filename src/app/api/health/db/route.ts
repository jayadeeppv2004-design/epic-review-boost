import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { describeDbFailure } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/db — is the deployed app actually able to read the database?
 *
 * Every dashboard page loads its data through client-side fetches, so a broken
 * database connection otherwise renders as empty tables with no error anywhere.
 * This endpoint separates the two failure modes that look identical from the UI:
 *
 *   stage "connect" — the app cannot reach/authenticate to Postgres at all
 *   stage "schema"  — connected, but the tables are missing (migrations never ran
 *                     against the database this deployment points at)
 *
 * Public on purpose, so it can be checked without a session when the dashboard
 * itself is unusable. It exposes only a pass/fail, the Prisma error code and a
 * fixed hint — never the connection string, the host, or any row contents.
 * Row counts are returned only to a logged-in admin.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "connect", ...describeDbFailure(err, "health/db") },
      { status: 503 }
    );
  }

  try {
    const [showrooms, employees, scanEvents] = await Promise.all([
      prisma.showroom.count(),
      prisma.employee.count(),
      prisma.scanEvent.count(),
    ]);
    return NextResponse.json({
      ok: true,
      stage: "ok",
      // Counts answer "is Vercel pointed at the database that holds the data?",
      // so they stay behind the admin session.
      counts: isAuthed() ? { showrooms, employees, scanEvents } : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "schema", ...describeDbFailure(err, "health/db") },
      { status: 503 }
    );
  }
}
