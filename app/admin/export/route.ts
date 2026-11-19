import { listPayments } from "@/lib/store";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const cols = ["createdAt", "name", "email", "phone", "amount", "currency", "status", "note", "payerEmail", "orderId", "captureId"] as const;
  const rows = (await listPayments()).filter((p) => p.status !== "CREATED");
  const csv = [cols.join(","), ...rows.map((p) => cols.map((c) => esc(p[c])).join(","))].join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payments.csv"',
    },
  });
}
