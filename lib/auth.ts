// Signed session cookie for the admin area. Uses Web Crypto so it runs in
// both middleware (edge) and route handlers (node).
export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 8;

const enc = new TextEncoder();

function secret(): string {
  // Prefer an explicit SESSION_SECRET. Otherwise derive one from other secrets,
  // so changing ADMIN_PASSWORD logs everyone out.
  return (
    process.env.SESSION_SECRET ||
    `${process.env.ADMIN_PASSWORD ?? ""}|${process.env.PAYPAL_CLIENT_SECRET ?? ""}|session`
  );
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

export async function checkCredentials(user: string, pass: string): Promise<boolean> {
  const u = process.env.ADMIN_USER ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!u || p.length < 12) return false; // refuse to run with an empty/weak password
  const [okU, okP] = await Promise.all([safeEqual(user, u), safeEqual(pass, p)]);
  return okU && okP;
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
