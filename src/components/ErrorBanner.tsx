import type { ApiFailure } from "@/lib/fetchJson";

/**
 * Shown whenever the dashboard could not load its data. Without this the page
 * renders as "no data", which looks identical to an empty database and sends
 * you hunting in the wrong place.
 */
export default function ErrorBanner({ failure }: { failure: ApiFailure }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
    >
      <div className="font-bold">
        {failure.error}
        {failure.code && (
          <span className="ml-2 rounded bg-red-200 px-1.5 py-0.5 font-mono text-xs">
            {failure.code}
          </span>
        )}
      </div>
      {failure.hint && <p className="mt-1 text-red-700">{failure.hint}</p>}
      {failure.detail && (
        <p className="mt-2 break-words font-mono text-xs text-red-600">
          {failure.errorName ? `${failure.errorName}: ` : ""}
          {failure.detail}
        </p>
      )}
      <p className="mt-2 text-xs text-red-600">
        This is a server-side problem — the numbers below are not real. Check{" "}
        <a className="underline" href="/api/health/db">
          /api/health/db
        </a>{" "}
        and the deployment logs.
      </p>
    </div>
  );
}
