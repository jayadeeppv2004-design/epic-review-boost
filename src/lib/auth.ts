import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "epic_session";

function sign(value: string): string {
  const secret = process.env.SESSION_SECRET || "epic";
  const mac = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(token: string | undefined): boolean {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const value = token.slice(0, idx);
  const expected = sign(value);
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@epictoyota.in";
  const adminPass = process.env.ADMIN_PASSWORD || "epic-admin";
  return email.trim().toLowerCase() === adminEmail.toLowerCase() && password === adminPass;
}

export function sessionCookie(): { name: string; value: string; options: object } {
  return {
    name: COOKIE,
    value: sign(`admin:${Date.now()}`),
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

export function clearCookie(): { name: string; value: string; options: object } {
  return { name: COOKIE, value: "", options: { httpOnly: true, path: "/", maxAge: 0 } };
}

/** Server-side auth guard for dashboard pages / API routes. */
export function isAuthed(): boolean {
  return verify(cookies().get(COOKIE)?.value);
}

export const COOKIE_NAME = COOKIE;
export { verify as verifyToken };
