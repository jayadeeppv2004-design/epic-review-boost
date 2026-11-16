export interface ApiFailure {
  error: string;
  code?: string;
  hint?: string;
  errorName?: string;
  detail?: string;
}

/**
 * Client-side GET that never fails silently.
 *
 * The dashboard previously used `if (res.ok) setState(...)` with no else, so a
 * 503 from a broken database connection rendered as empty tables and zeroed
 * tiles — indistinguishable from a genuinely empty database. Every caller now
 * gets either `data` or a `failure` it is expected to display.
 */
export async function getJson<T>(
  url: string
): Promise<{ data?: T; failure?: ApiFailure }> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { failure: { error: "Could not reach the server. Check your connection." } };
  }

  if (res.status === 401) {
    return {
      failure: {
        error: "Your session has expired.",
        hint: "Sign in again to continue.",
      },
    };
  }

  const body = (await res.json().catch(() => null)) as
    | (T & Partial<ApiFailure>)
    | null;

  if (!res.ok) {
    return {
      failure: {
        error: body?.error || `Request failed (${res.status}).`,
        code: body?.code,
        hint: body?.hint,
        errorName: body?.errorName,
        detail: body?.detail,
      },
    };
  }

  if (body === null) return { failure: { error: "The server sent an unreadable response." } };
  return { data: body as T };
}
