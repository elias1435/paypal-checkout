import { NextResponse } from "next/server";
import { isAdmin } from "./auth";
import { isCrossSite } from "./ratelimit";

/**
 * Guard for admin write endpoints: must be logged in and the request must come
 * from this site. Returns an error response, or null when the request may proceed.
 */
export async function guardAdmin(req: Request, opts: { json?: boolean } = {}): Promise<NextResponse | null> {
  if (isCrossSite(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Requiring JSON forces a CORS preflight for any cross-site attempt (extra CSRF layer).
  if (opts.json && !req.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "Bad request" }, { status: 415 });
  if (!(await isAdmin())) return NextResponse.json({ error: "פג תוקף ההתחברות, יש להתחבר מחדש" }, { status: 401 });
  return null;
}
