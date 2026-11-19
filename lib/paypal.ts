import { apiBase, config } from "./config";

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${config.clientId}:${config.secret}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  return (await res.json()).access_token;
}

async function call(path: string, body?: unknown) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal ${path} failed (${res.status}): ${JSON.stringify(json)}`);
  return json;
}

export function createOrder(amount: string, currency: string, description: string) {
  return call("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: currency, value: amount },
        description: description.slice(0, 127),
      },
    ],
  });
}

export function captureOrder(orderId: string) {
  return call(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`);
}
