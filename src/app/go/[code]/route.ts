import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { logEvent } from "@/lib/track";
import { clientIp } from "@/lib/util";
import { describeDbFailure } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// PRD §7.3 step 4 — logs the higher-intent review_click, then 302-redirects
// to the correct showroom's Google review URL. No JS required.
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const h = headers();

  let result;
  try {
    result = await logEvent(params.code, "review_click", h, clientIp(h));
  } catch (err) {
    // A customer is standing at the counter with their phone out — give them a
    // real status code and a logged error rather than an opaque blank 500.
    const failure = describeDbFailure(err, "GET /go/[code]");
    return NextResponse.json(
      { error: "Review links are temporarily unavailable.", code: failure.code },
      { status: 503 }
    );
  }

  if (!result) {
    return NextResponse.json({ error: "unknown code" }, { status: 404 });
  }

  const dest =
    result.googleReviewUrl && result.googleReviewUrl.trim().length > 0
      ? result.googleReviewUrl
      : "https://www.google.com/maps";

  return NextResponse.redirect(dest, 302);
}
