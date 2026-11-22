import { apiBase, config } from "./config";
import { kvGet, kvSet } from "./store";

/** A PayPal API error with the details PayPal returned (name / issue / debug_id). */
export class PayPalError extends Error {
  constructor(
    public step: string,
    public status: number,
    public code: string, // PayPal "issue" (e.g. PAYEE_ACCOUNT_RESTRICTED) or error name
    public detail: string,
    public debugId?: string
  ) {
    super(`PayPal ${step} failed (${status}) ${code}: ${detail}`);
  }
  /** Short text stored on the payment and shown in the admin. */
  get summary() {
    return `${this.code}${this.debugId ? ` (debug_id ${this.debugId})` : ""}`;
  }
}

// Hebrew explanations for the PayPal codes that usually explain a failing account.
const EXPLAIN: Record<string, string> = {
  invalid_client: "ה-Client ID וה-Secret לא תואמים, או שהם שייכים לסביבה אחרת (Sandbox/Live) מזו שב-PAYPAL_ENV.",
  RESOURCE_NOT_FOUND: "ההזמנה לא קיימת בחשבון הזה – בדרך כלל ההזמנה נוצרה עם פרטי חשבון/סביבה אחרים.",
  PERMISSION_DENIED: "לאפליקציה ב-PayPal אין הרשאה לפעולה. בדקו ב-developer.paypal.com שהאפליקציה (Live) מאפשרת Accept payments.",
  NOT_AUTHORIZED: "לאפליקציה ב-PayPal אין הרשאה לפעולה. בדקו ב-developer.paypal.com שהאפליקציה (Live) מאפשרת Accept payments.",
  PAYEE_ACCOUNT_RESTRICTED: "חשבון ה-PayPal המקבל מוגבל. יש להיכנס לחשבון PayPal ולטפל בהגבלה (Resolution Center).",
  PAYEE_ACCOUNT_LOCKED_OR_CLOSED: "חשבון ה-PayPal המקבל נעול או סגור.",
  PAYEE_ACCOUNT_INVALID: "חשבון ה-PayPal המקבל לא תקין או לא מאומת (יש לאשר את כתובת האימייל בחשבון).",
  PAYEE_NOT_ENABLED_FOR_CARD_PROCESSING: "החשבון המקבל לא מאופשר לקבלת תשלומי כרטיס אשראי. יש לבדוק עם PayPal.",
  CURRENCY_NOT_SUPPORTED: "המטבע שנבחר לא נתמך בחשבון הזה. נסו לשנות מטבע בהגדרות.",
  INSTRUMENT_DECLINED: "הכרטיס/אמצעי התשלום נדחה על ידי הבנק או PayPal. זו בעיה של הלקוח, לא של האתר.",
  TRANSACTION_REFUSED: "PayPal סירבה לעסקה (לרוב חשד או הגבלה בחשבון).",
  COMPLIANCE_VIOLATION: "PayPal חסמה את העסקה מסיבות רגולציה. יש לפנות לתמיכת PayPal.",
  PAYER_ACTION_REQUIRED: "הלקוח צריך להשלים שלב נוסף (למשל אימות 3D Secure).",
  ORDER_NOT_APPROVED: "הלקוח לא אישר את התשלום בחלון PayPal.",
  RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION:
    "התשלום ממתין: החשבון המקבל מוגדר לאשר ידנית תשלומים במטבע הזה. יש לאשר את התשלום בחשבון PayPal ולשנות את הגדרת קבלת התשלומים.",
  UNILATERAL: "התשלום ממתין: החשבון המקבל לא מאומת/לא הושלם. יש להשלים את פתיחת החשבון ב-PayPal.",
  VERIFICATION_REQUIRED: "התשלום ממתין: PayPal דורשת אימות של החשבון המקבל.",
  PENDING_REVIEW: "התשלום ממתין לבדיקה של PayPal. בדרך כלל מתאשר תוך 24 שעות.",
};

export const explain = (code: string) => EXPLAIN[code.replace(/^PENDING:/, "")] ?? null;

async function toError(step: string, res: Response): Promise<PayPalError> {
  const j = await res.json().catch(() => ({}));
  const code = j.details?.[0]?.issue ?? j.error ?? j.name ?? `HTTP_${res.status}`;
  const detail = j.details?.[0]?.description ?? j.error_description ?? j.message ?? "";
  return new PayPalError(step, res.status, code, detail, j.debug_id);
}

/** Fresh token on every call — nothing cached between credential changes. */
async function accessToken(): Promise<{ token: string; appId?: string }> {
  const auth = Buffer.from(`${config.clientId}:${config.secret}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw await toError("auth", res);
  const j = await res.json();
  return { token: j.access_token, appId: j.app_id };
}

async function call(step: string, path: string, body?: unknown) {
  const { token } = await accessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw await toError(step, res);
  return res.json();
}

export function createOrder(amount: string, currency: string, description: string) {
  return call("create", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: currency, value: amount }, description: description.slice(0, 127) }],
  });
}

export function captureOrder(orderId: string) {
  return call("capture", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`);
}

// ---------- Error log (last 30, kept in the database for the admin check page) ----------
export type LoggedError = { at: string; step: string; status: number; code: string; detail: string; debugId?: string; orderId?: string };

export async function logPayPalError(e: unknown, orderId?: string) {
  console.error(e);
  const entry: LoggedError =
    e instanceof PayPalError
      ? { at: new Date().toISOString(), step: e.step, status: e.status, code: e.code, detail: e.detail.slice(0, 300), debugId: e.debugId, orderId }
      : { at: new Date().toISOString(), step: "network", status: 0, code: "NETWORK_ERROR", detail: String((e as Error)?.message ?? e).slice(0, 300), orderId };
  try {
    const list: LoggedError[] = JSON.parse((await kvGet("paypal_errors")) ?? "[]");
    await kvSet("paypal_errors", JSON.stringify([entry, ...list].slice(0, 30)));
  } catch {}
  return entry;
}

export async function recentPayPalErrors(): Promise<LoggedError[]> {
  try {
    return JSON.parse((await kvGet("paypal_errors")) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Connection test for the admin: gets a token and creates a 1.00 test order.
 * An order that is never approved is never charged and expires on its own.
 */
export async function runConnectionCheck(currency: string) {
  const steps: { name: string; ok: boolean; info: string; code?: string }[] = [];
  try {
    const { appId } = await accessToken();
    steps.push({ name: "auth", ok: true, info: appId ? `App ID: ${appId}` : "" });
  } catch (e) {
    const err = e instanceof PayPalError ? e : null;
    steps.push({ name: "auth", ok: false, info: err ? `${err.code}: ${err.detail}` : String(e), code: err?.code ?? "NETWORK_ERROR" });
    return steps;
  }
  try {
    const order = await createOrder("1.00", currency, "Connection test - not charged");
    steps.push({ name: "order", ok: true, info: `Order ${order.id} (${order.status})` });
  } catch (e) {
    const err = e instanceof PayPalError ? e : null;
    steps.push({ name: "order", ok: false, info: err ? `${err.code}: ${err.detail}${err.debugId ? ` · debug_id ${err.debugId}` : ""}` : String(e), code: err?.code });
  }
  return steps;
}
