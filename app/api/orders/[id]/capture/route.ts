import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { getPayment, savePayment } from "@/lib/store";
import { clientIp, isCrossSite, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (isCrossSite(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(`capture:${clientIp(req)}`, 20, 60_000))
    return NextResponse.json({ error: "יותר מדי בקשות, נסו שוב בעוד דקה" }, { status: 429 });
  const { id } = await params;
  if (!/^[A-Z0-9]{5,40}$/.test(id)) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  const existing = await getPayment(id);
  if (!existing) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  if (existing.status === "COMPLETED") return NextResponse.json({ status: "COMPLETED" });

  try {
    const result = await captureOrder(id);
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
    await savePayment({
      ...existing,
      status: capture?.status ?? result.status, // COMPLETED / PENDING / DECLINED
      captureId: capture?.id,
      amount: capture?.amount?.value ?? existing.amount,
      currency: capture?.amount?.currency_code ?? existing.currency,
      payerEmail: result.payer?.email_address,
    });
    return NextResponse.json({ status: capture?.status ?? result.status });
  } catch (e) {
    console.error(e);
    await savePayment({ ...existing, status: "FAILED" });
    return NextResponse.json({ error: "התשלום לא הושלם" }, { status: 502 });
  }
}
