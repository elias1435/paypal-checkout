import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { MIN_PASSWORD, SESSION_COOKIE, checkCredentials, createSession, currentAdminUser, sessionCookieOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { setAdminAccount } from "@/lib/settings";

export async function POST(req: Request) {
  const denied = await guardAdmin(req, { json: true });
  if (denied) return denied;
  if (!rateLimit(`account:${clientIp(req)}`, 10, 15 * 60_000))
    return NextResponse.json({ error: "יותר מדי ניסיונות, נסו שוב בעוד 15 דקות" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword ?? "");
  const newUser = String(body.newUser ?? "").trim();
  const newPassword = String(body.newPassword ?? "");

  // Re-check the current password even though the admin is logged in.
  if (!(await checkCredentials(await currentAdminUser(), currentPassword)))
    return NextResponse.json({ error: "הסיסמה הנוכחית שגויה" }, { status: 400 });
  if (newUser.length < 3 || newUser.length > 100 || /\s/.test(newUser))
    return NextResponse.json({ error: "שם המשתמש חייב להכיל 3 תווים לפחות, ללא רווחים" }, { status: 400 });
  if (newPassword && newPassword.length < MIN_PASSWORD)
    return NextResponse.json({ error: `הסיסמה החדשה חייבת להכיל ${MIN_PASSWORD} תווים לפחות` }, { status: 400 });

  try {
    await setAdminAccount({ user: newUser, hash: await hashPassword(newPassword || currentPassword) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "השמירה נכשלה (בעיה במסד הנתונים)" }, { status: 500 });
  }

  // The signing key changed, so issue a fresh session for this browser (other sessions are logged out).
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(), sessionCookieOptions);
  return res;
}
