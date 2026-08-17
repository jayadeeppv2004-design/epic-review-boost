import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Edge-safe HMAC verification using Web Crypto (mirror of lib/auth.ts sign()).
async function verify(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const value = token.slice(0, idx);
  const mac = token.slice(idx + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return mac === expected;
}

export async function middleware(req: NextRequest) {
  const secret = process.env.SESSION_SECRET || "epic";
  const token = req.cookies.get("epic_session")?.value;
  if (!(await verify(token, secret))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Protect the dashboard only. Public: /login, /r/[code], /go/[code], /api/*.
export const config = {
  matcher: ["/dashboard/:path*"],
};
