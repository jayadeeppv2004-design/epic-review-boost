import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { logEvent, type LogResult } from "@/lib/track";
import { clientIp } from "@/lib/util";
import { describeDbFailure } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// PRD §5.4 / §7.3 — branded one-tap interstitial.
// Logs the SCAN on load, then a single clear button logs the review-click
// and redirects to the correct showroom's Google review page.
export default async function TrackedRedirect({
  params,
}: {
  params: { code: string };
}) {
  const h = headers();

  let result: LogResult | null;
  try {
    result = await logEvent(params.code, "scan", h, clientIp(h));
  } catch (err) {
    // The database is unreachable. This page is what a customer sees after
    // scanning a QR code, so fail with a readable message instead of Next's
    // blank 500 screen.
    describeDbFailure(err, "GET /r/[code]");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 px-6 text-center">
        <div className="w-full max-w-sm">
          <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-toyota-red">
            EPIC Toyota
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            We&apos;re having a technical problem
          </h1>
          <p className="mt-4 text-neutral-300">
            Sorry — we can&apos;t open your review link right now. Please try again in a
            few minutes.
          </p>
        </div>
      </div>
    );
  }

  if (!result) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-2 text-sm font-semibold uppercase tracking-widest text-toyota-red">
          EPIC Toyota
        </div>
        <h1 className="text-2xl font-extrabold text-white">{result.showroomName}</h1>

        <div className="my-8 text-5xl tracking-widest text-yellow-400">★★★★★</div>

        <p className="mb-2 text-lg text-neutral-200">
          Thanks for visiting! Please take a moment to share your experience.
        </p>
        <p className="mb-8 text-sm text-neutral-400">
          It takes less than a minute — no app, no login.
        </p>

        <a href={`/go/${params.code}`} className="btn-primary w-full py-4 text-base">
          ✍️ Write your review on Google
        </a>

        <p className="mt-6 text-xs text-neutral-500">
          You&apos;ll be taken directly to Google to post your review.
        </p>
      </div>
    </div>
  );
}
