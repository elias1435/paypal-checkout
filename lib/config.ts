// Hostinger's panel can add stray spaces/quotes around values; strip them.
export const env = (key: string, fallback = "") =>
  (process.env[key] ?? fallback).trim().replace(/^(["'])(.*)\1$/, "$2");

export const config = {
  env: ["live", "production"].includes(env("PAYPAL_ENV").toLowerCase()) ? "live" : "sandbox",
  clientId: env("NEXT_PUBLIC_PAYPAL_CLIENT_ID"),
  secret: env("PAYPAL_CLIENT_SECRET"),
  currency: env("CURRENCY", "ILS").toUpperCase(),
  businessName: env("BUSINESS_NAME", "תשלום מאובטח"),
};

export const apiBase = () =>
  config.env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const MAX = 999999.99; // PayPal's per-transaction ceiling

/** Returns a normalized "12.34" string, or null if not a positive amount. */
export function parseAmount(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (n <= 0 || n > MAX) return null;
  return n.toFixed(2);
}
