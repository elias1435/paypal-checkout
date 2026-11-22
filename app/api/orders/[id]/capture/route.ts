import { NextResponse } from "next/server";
import { PayPalError, captureOrder, logPayPalError } from "@/lib/paypal";
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
    const status: string = capture?.status ?? result.status; // COMPLETED / PENDING / DECLINED
    // PayPal explains PENDING/DECLINED captures in status_details.reason
    const reason: string | undefined = capture?.status_details?.reason;
    await savePayment({
      ...existing,
      status,
      error: status === "COMPLETED" ? undefined : reason ? `${status === "PENDING" ? "PENDING:" : ""}${reason}` : undefined,
      captureId: capture?.id,
      amount: capture?.amount?.value ?? existing.amount,
      currency: capture?.amount?.currency_code ?? existing.currency,
      payerEmail: result.payer?.email_address,
    });
    return NextResponse.json({ status: capture?.status ?? result.status });
  } catch (e) {
    const logged = await logPayPalError(e, id);
    await savePayment({ ...existing, status: "FAILED", error: e instanceof PayPalError ? e.summary : logged.code });
    return NextResponse.json({ error: "התשלום לא הושלם" }, { status: 502 });
  }
}
