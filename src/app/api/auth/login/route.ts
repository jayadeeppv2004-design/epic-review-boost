import { NextResponse } from "next/server";
import { checkCredentials, sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!checkCredentials(String(email || ""), String(password || ""))) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  const c = sessionCookie();
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
