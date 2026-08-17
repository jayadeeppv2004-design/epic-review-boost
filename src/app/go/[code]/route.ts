import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { logEvent } from "@/lib/track";
import { clientIp } from "@/lib/util";

export const dynamic = "force-dynamic";

// PRD §7.3 step 4 — logs the higher-intent review_click, then 302-redirects
// to the correct showroom's Google review URL. No JS required.
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const h = headers();
  const result = await logEvent(params.code, "review_click", h, clientIp(h));

  if (!result) {
    return NextResponse.json({ error: "unknown code" }, { status: 404 });
  }

  const dest =
    result.googleReviewUrl && result.googleReviewUrl.trim().length > 0
      ? result.googleReviewUrl
      : "https://www.google.com/maps";

  return NextResponse.redirect(dest, 302);
}
