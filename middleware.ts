import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC = new Set(["/admin/login", "/api/admin/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res: NextResponse;

  if (PUBLIC.has(pathname) || (await verifySession(req.cookies.get(SESSION_COOKIE)?.value))) {
    res = NextResponse.next();
  } else if (pathname.startsWith("/api/")) {
    res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    res = NextResponse.redirect(new URL("/admin/login", req.url));
  }
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
