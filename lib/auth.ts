// Signed session cookie for the admin area.
import { cookies } from "next/headers";
import { env } from "./config";
export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 8;

const enc = new TextEncoder();

function secret(): string {
  // Prefer an explicit SESSION_SECRET. Otherwise derive one from other secrets,
  // so changing ADMIN_PASSWORD logs everyone out.
  return env("SESSION_SECRET") || `${env("ADMIN_PASSWORD")}|${env("PAYPAL_CLIENT_SECRET")}|session`;
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(data: string, key = secret()): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Constant-time string comparison (hashes first, so length isn't leaked). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = "compare";
  const [x, y] = await Promise.all([hmac(a, key), hmac(b, key)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export const MIN_PASSWORD = 10;

/** Problem with the server's admin settings, if any (shown on the login page). */
export function adminConfigProblem(): string | null {
  if (!env("ADMIN_USER") || !env("ADMIN_PASSWORD")) return "missing";
  if (env("ADMIN_PASSWORD").length < MIN_PASSWORD) return "short";
  return null;
}

export async function checkCredentials(user: string, pass: string): Promise<boolean> {
  if (adminConfigProblem()) return false;
  const [okU, okP] = await Promise.all([
    safeEqual(user.trim().toLowerCase(), env("ADMIN_USER").toLowerCase()),
    safeEqual(pass, env("ADMIN_PASSWORD")),
  ]);
  return okU && okP;
}

/** For server components / route handlers. */
export async function isAdmin(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function createSession(): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600_000 })));
  return `${payload}.${b64url(await hmac(payload))}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!(await safeEqual(sig, b64url(await hmac(payload))))) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}
