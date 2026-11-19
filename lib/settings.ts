import { DEFAULT_SETTINGS, Settings, sanitizeSettings } from "./settings-schema";
import { kvGet, kvSet } from "./store";

// In-memory cache; the app runs as a single process, and saves update it directly.
let cache: { settings: Settings; logoVersion: string | null } | null = null;

export type PublicSettings = Settings & { logoVersion: string | null };

export async function getSettings(): Promise<PublicSettings> {
  if (!cache) {
    try {
      const raw = await kvGet("settings");
      const meta = await kvGet("logo_meta");
      cache = {
        settings: sanitizeSettings(raw ? JSON.parse(raw) : {}, DEFAULT_SETTINGS),
        logoVersion: meta ? JSON.parse(meta).v : null,
      };
    } catch (e) {
      // Database unreachable: show defaults, but don't cache so it retries next request.
      console.error("settings load failed", e);
      return { ...DEFAULT_SETTINGS, logoVersion: null };
    }
  }
  return { ...cache.settings, logoVersion: cache.logoVersion };
}

export async function saveSettings(input: unknown): Promise<Settings> {
  const current = await getSettings();
  const next = sanitizeSettings(input, current);
  await kvSet("settings", JSON.stringify(next));
  cache = { settings: next, logoVersion: current.logoVersion };
  return next;
}

// ---------- Logo (stored in the database so it survives deploys) ----------
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Detects PNG / JPEG / WEBP from the file bytes (never trust the browser). SVG is refused on purpose. */
export function detectImage(b: Uint8Array): string | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return "image/webp";
  return null;
}

export async function saveLogo(bytes: Uint8Array, mime: string) {
  const v = Date.now().toString(36);
  await kvSet("logo", Buffer.from(bytes).toString("base64"));
  await kvSet("logo_meta", JSON.stringify({ v, mime }));
  if (cache) cache.logoVersion = v;
}

export async function clearLogo() {
  await kvSet("logo", null);
  await kvSet("logo_meta", null);
  if (cache) cache.logoVersion = null;
}

export async function getLogo(): Promise<{ bytes: Buffer; mime: string; v: string } | null> {
  const [data, meta] = await Promise.all([kvGet("logo"), kvGet("logo_meta")]);
  if (!data || !meta) return null;
  const { v, mime } = JSON.parse(meta);
  return { bytes: Buffer.from(data, "base64"), mime, v };
}

// ---------- Admin account (replaces ADMIN_USER / ADMIN_PASSWORD once saved) ----------
export type AdminAccount = { user: string; hash: string };

export async function getAdminAccount(): Promise<AdminAccount | null> {
  const raw = await kvGet("admin_account");
  return raw ? JSON.parse(raw) : null;
}

export async function setAdminAccount(acc: AdminAccount) {
  await kvSet("admin_account", JSON.stringify(acc));
}
