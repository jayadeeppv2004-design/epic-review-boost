import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAuthed } from "@/lib/auth";
import { describeDbFailure } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/**
 * Shape of the configured connection, with nothing secret in it.
 *
 * The port and host *kind* are the two facts that actually matter when a
 * deployment cannot reach Supabase — 6543 is the transaction pooler, 5432 is the
 * direct/session connection, and `db.<ref>.supabase.co` is the legacy direct host
 * that is now IPv6-only and unreachable from Vercel. The project ref lives in the
 * username and in that legacy hostname, so neither is ever returned.
 */
function describeUrl(name: string) {
  const raw = process.env[name];
  if (!raw) return { set: false as const };
  try {
    const u = new URL(raw);
    const host = u.hostname;
    const hostKind = host.includes("pooler.supabase.com")
      ? "supabase-pooler"
      : /^db\..*\.supabase\.co$/.test(host)
        ? "supabase-direct-legacy"
        : host === "localhost" || host === "127.0.0.1"
          ? "localhost"
          : "other";
    return {
      set: true as const,
      protocol: u.protocol.replace(":", ""),
      port: u.port || "(default)",
      hostKind,
      pgbouncer: u.searchParams.get("pgbouncer") === "true",
      connectionLimit: u.searchParams.get("connection_limit") ?? null,
    };
  } catch {
    return { set: true as const, parseable: false as const };
  }
}

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
 * itself is unusable. It exposes only a pass/fail, the Prisma error code, the
 * error class, a redacted message excerpt and the non-secret shape of the
 * connection URL — never the host, user, password or any row contents.
 * Row counts are returned only to a logged-in admin.
 */
export async function GET() {
  const env = {
    DATABASE_URL: describeUrl("DATABASE_URL"),
    DIRECT_URL: describeUrl("DIRECT_URL"),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "connect", ...describeDbFailure(err, "health/db"), env },
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
      env,
      // Counts answer "is Vercel pointed at the database that holds the data?",
      // so they stay behind the admin session.
      counts: isAuthed() ? { showrooms, employees, scanEvents } : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, stage: "schema", ...describeDbFailure(err, "health/db"), env },
      { status: 503 }
    );
  }
}
