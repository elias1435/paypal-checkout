// Simple in-memory fixed-window rate limiter (single server instance).
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * True when the browser says the request came from another website.
 * Uses Sec-Fetch-Site, which (unlike Host/Origin) is not changed by reverse proxies.
 */
export function isCrossSite(req: Request): boolean {
  return req.headers.get("sec-fetch-site") === "cross-site";
}

/** Relative redirect, so it works behind proxies that rewrite the host. */
export function redirect303(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}
