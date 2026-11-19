export const config = {
  env: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
  secret: process.env.PAYPAL_CLIENT_SECRET ?? "",
  currency: (process.env.CURRENCY ?? "ILS").toUpperCase(),
  defaultAmount: process.env.DEFAULT_AMOUNT ?? "10.00",
  minAmount: Number(process.env.MIN_AMOUNT ?? 1),
  maxAmount: Number(process.env.MAX_AMOUNT ?? 10000),
  businessName: process.env.BUSINESS_NAME ?? "Payment",
};

export const apiBase = () =>
  config.env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

/** Returns a normalized "12.34" string, or null if invalid / out of range. */
export function parseAmount(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  if (n < config.minAmount || n > config.maxAmount) return null;
  return n.toFixed(2);
}
