import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { listPayments, savePayment } from "@/lib/store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = (await listPayments()).find((p) => p.orderId === id);
  if (!existing) return NextResponse.json({ error: "Unknown order" }, { status: 404 });

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
    return NextResponse.json({ error: "Payment could not be completed" }, { status: 502 });
  }
}
