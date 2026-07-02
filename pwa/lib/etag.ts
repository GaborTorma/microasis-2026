import { createHash } from "node:crypto";

type Payload = { body: string; etag: string };

/**
 * Serialize + hash an API payload, memoized per warm server instance. The
 * routes are dynamic (they read If-None-Match, which ISR route caching can't
 * see), so this memo is what keeps Neon reads at the ~once-per-minute rate
 * the old `revalidate = 60` gave.
 */
export function etagPayload(load: () => Promise<unknown>, ttlMs = 60_000) {
  let memo: { at: number; value: Promise<Payload> } | null = null;
  let lastGood: Payload | null = null;

  const compute = async (): Promise<Payload> => {
    const body = JSON.stringify(await load());
    const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
    lastGood = { body, etag };
    return lastGood;
  };

  return () => {
    if (memo && Date.now() - memo.at < ttlMs) return memo.value;
    const entry = { at: Date.now(), value: compute() };
    // A failed load must not get pinned for the whole TTL.
    entry.value.catch(() => {
      if (memo === entry) memo = null;
    });
    memo = entry;
    // Serve the last good payload over a transient DB failure (what the old
    // ISR cache did); only surface the error when there is nothing to serve.
    return entry.value.catch((err) => {
      if (lastGood) return lastGood;
      throw err;
    });
  };
}

/**
 * Answer a conditional GET: full body on first fetch, bodyless 304 when the
 * client's If-None-Match still matches. `includes` (not equality) tolerates
 * multi-value lists and `W/` prefixes a proxy may add.
 */
export async function etagResponse(
  request: Request,
  payload: () => Promise<Payload>,
): Promise<Response> {
  const { body, etag } = await payload();
  const shared = { ETag: etag, "Cache-Control": "public, max-age=0, must-revalidate" };
  if (request.headers.get("if-none-match")?.includes(etag)) {
    return new Response(null, { status: 304, headers: shared });
  }
  return new Response(body, {
    headers: { ...shared, "Content-Type": "application/json" },
  });
}
