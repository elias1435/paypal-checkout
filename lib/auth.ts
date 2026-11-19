// Admin authentication: signed session cookie + credentials from the database
// (falls back to ADMIN_USER / ADMIN_PASSWORD until the admin sets their own).
import { cookies } from "next/headers";
import { env } from "./config";
import { verifyPassword } from "./password";
import { getAdminAccount } from "./settings";

export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 8;
export const MIN_PASSWORD = 10;

const enc = new TextEncoder();

/** Session signing key. Changes when the password changes, which logs out other sessions. */
async function secret(): Promise<string> {
  const acc = await getAdminAccount().catch(() => null);
  const pwPart = acc ? acc.hash : env("ADMIN_PASSWORD");
  return `${env("SESSION_SECRET")}|${pwPart}|${env("PAYPAL_CLIENT_SECRET")}|session`;
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(data: string, key: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Constant-time string comparison (hashes first, so length isn't leaked). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([hmac(a, "compare"), hmac(b, "compare")]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Problem with the admin login setup, if any (shown on the login page). */
export async function adminConfigProblem(): Promise<string | null> {
  try {
    if (await getAdminAccount()) return null;
  } catch {
    return "db";
  }
  if (!env("ADMIN_USER") || !env("ADMIN_PASSWORD")) return "missing";
  if (env("ADMIN_PASSWORD").length < MIN_PASSWORD) return "short";
  return null;
}

export async function currentAdminUser(): Promise<string> {
  const acc = await getAdminAccount().catch(() => null);
  return acc ? acc.user : env("ADMIN_USER");
}

export async function checkCredentials(user: string, pass: string): Promise<boolean> {
  const u = user.trim().toLowerCase();
  const acc = await getAdminAccount().catch(() => null);
  if (acc) {
    const [okUser, okPass] = await Promise.all([safeEqual(u, acc.user.toLowerCase()), verifyPassword(pass, acc.hash)]);
    return okUser && okPass;
  }
  if (await adminConfigProblem()) return false;
  const [okUser, okPass] = await Promise.all([
    safeEqual(u, env("ADMIN_USER").toLowerCase()),
    safeEqual(pass, env("ADMIN_PASSWORD")),
  ]);
  return okUser && okPass;
}

export async function createSession(): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600_000 })));
  return `${payload}.${b64url(await hmac(payload, await secret()))}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!(await safeEqual(sig, b64url(await hmac(payload, await secret()))))) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_HOURS * 3600,
};

/** For server components / route handlers. */
export async function isAdmin(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
