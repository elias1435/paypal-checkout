import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_HOURS, checkCredentials, createSession } from "@/lib/auth";
import { clientIp, rateLimit, sameOrigin } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/login?${q}`, req.url), 303);
  if (!sameOrigin(req)) return back("error=1");
  // 5 attempts per 15 minutes per IP
  if (!rateLimit(`login:${clientIp(req)}`, 5, 15 * 60_000)) return back("locked=1");

  const form = await req.formData();
  const ok = await checkCredentials(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return back("error=1");
  }

  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return res;
}
