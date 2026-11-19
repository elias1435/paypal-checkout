import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_HOURS, checkCredentials, createSession } from "@/lib/auth";
import { clientIp, isCrossSite, rateLimit, redirect303 } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (isCrossSite(req)) return redirect303("/admin/login?error=1");

  const form = await req.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  // 10 attempts per 15 minutes per IP (per username if the proxy hides the IP)
  const ip = clientIp(req);
  const key = ip === "unknown" ? `login-user:${username.toLowerCase()}` : `login:${ip}`;
  if (!rateLimit(key, 10, 15 * 60_000)) return redirect303("/admin/login?locked=1");

  if (!(await checkCredentials(username, password))) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return redirect303("/admin/login?error=1");
  }

  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin", "Cache-Control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
