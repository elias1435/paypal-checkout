import { NextResponse } from "next/server";
import { config, parseAmount } from "@/lib/config";
import { createOrder } from "@/lib/paypal";
import { savePayment } from "@/lib/store";
import { clientIp, isCrossSite, rateLimit } from "@/lib/ratelimit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  if (isCrossSite(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`order:${clientIp(req)}`, 10, 60_000))
    return NextResponse.json({ error: "יותר מדי בקשות, נסו שוב בעוד דקה" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 30);
  const note = clean(body.note, 300);
  const amount = parseAmount(body.amount);

  if (!name) return NextResponse.json({ error: "יש להזין שם מלא" }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: "יש להזין כתובת אימייל תקינה" }, { status: 400 });
  if (!amount)
    return NextResponse.json({ error: "יש להזין סכום תקין" }, { status: 400 });

  try {
    const order = await createOrder(amount, note || `תשלום ל-${config.businessName}`);
    await savePayment({
      orderId: order.id,
      status: "CREATED",
      amount,
      currency: config.currency,
      name,
      email,
      phone: phone || undefined,
      note: note || undefined,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "לא ניתן ליצור את התשלום, נסו שוב" }, { status: 502 });
  }
}
