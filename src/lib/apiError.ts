import { NextResponse } from "next/server";

/**
 * Plain-English explanation for the Prisma error codes this app can realistically
 * hit in production. Keyed by code so the UI can show something actionable
 * instead of an empty 500.
 */
const HINTS: Record<string, string> = {
  P1000:
    "The database rejected the credentials in DATABASE_URL. The Supabase password was most likely rotated — copy the current connection string from Supabase and update it in Vercel.",
  P1001:
    "The database server is unreachable. The Supabase project may be paused, or the pooler hostname in DATABASE_URL may no longer exist.",
  P1002: "The database server was reached but timed out while connecting.",
  P1003: "The database named in DATABASE_URL does not exist.",
  P1008: "The database operation timed out.",
  P1010: "The database user in DATABASE_URL was denied access.",
  P1017: "The database server closed the connection.",
  P2021:
    "A table this query needs does not exist in the database. Run `npm run db:push` against the database Vercel is pointed at.",
  P2022: "A column this query needs does not exist in the database.",
};

/** Extracts a Prisma error code without depending on `instanceof` surviving bundling. */
function prismaCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { code?: unknown; errorCode?: unknown };
  // Known request errors carry `code`; initialization errors carry `errorCode`.
  const code = typeof e.code === "string" ? e.code : undefined;
  const errorCode = typeof e.errorCode === "string" ? e.errorCode : undefined;
  return code ?? errorCode;
}

/**
 * Strip anything credential-shaped out of an error message.
 *
 * Prisma puts the whole connection string into some of its errors, so nothing
 * derived from a message is safe until it has been through here.
 */
export function redactSecrets(message: string): string {
  let out = message;

  // Whole connection strings, wherever they appear.
  out = out.replace(/postgres(ql)?:\/\/\S+/gi, "[connection-string-redacted]");
  // Bare user:password@host pairs.
  out = out.replace(/[\w.-]+:[^@\s/]+@[\w.-]+/g, "[credentials-redacted]");

  // Belt and braces: never echo the configured host or password back, even if
  // they reached the message in a shape the patterns above do not match.
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const raw = process.env[name];
    if (!raw) continue;
    try {
      const u = new URL(raw);
      for (const secret of [u.password, u.username, u.hostname]) {
        if (secret && secret.length > 3) out = out.split(secret).join("[redacted]");
      }
    } catch {
      /* unparseable URL — the patterns above are all we have */
    }
  }

  return out.slice(0, 400);
}

export interface DbFailure {
  error: string;
  code?: string;
  hint?: string;
  errorName?: string;
  detail?: string;
}

/**
 * Describe a thrown error for the client.
 *
 * Returns the stable error code, a hand-written hint, the error's class name and
 * a redacted one-line excerpt of the message. The raw message is never returned
 * verbatim — Prisma embeds the full connection string in its initialization
 * errors, and this app's dashboard renders API errors straight into the page.
 * The complete error is written to the server log, where it is visible in
 * Vercel → Logs.
 */
export function describeDbFailure(err: unknown, context: string): DbFailure {
  console.error(`[${context}] database query failed:`, err);

  const code = prismaCode(err);
  const errorName =
    err && typeof err === "object" && typeof (err as Error).name === "string"
      ? (err as Error).name
      : undefined;
  const rawMessage =
    err && typeof err === "object" && typeof (err as Error).message === "string"
      ? (err as Error).message
      : String(err ?? "");

  return {
    error: code
      ? `Database error ${code}`
      : "The server could not read from the database.",
    code,
    hint: code ? HINTS[code] : undefined,
    errorName,
    // First non-empty line only; Prisma messages are long and multi-paragraph.
    detail: redactSecrets(
      rawMessage.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? ""
    ),
  };
}

/** Wraps a route handler body so a database failure becomes a descriptive 503. */
export async function withDb<T>(
  context: string,
  fn: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return NextResponse.json(describeDbFailure(err, context), { status: 503 });
  }
}
