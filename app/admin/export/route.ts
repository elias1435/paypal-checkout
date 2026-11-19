import { isAdmin } from "@/lib/auth";
import { listPayments } from "@/lib/store";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

const COLS = [
  ["createdAt", "תאריך"], ["name", "שם"], ["email", "אימייל"], ["phone", "טלפון"], ["amount", "סכום"],
  ["currency", "מטבע"], ["status", "סטטוס"], ["note", "הערה"], ["payerEmail", "אימייל PayPal"],
  ["orderId", "מספר הזמנה"], ["captureId", "אסמכתא"],
] as const;

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const all = await listPayments().catch(() => null);
  if (!all) return new Response("Database error", { status: 503 });
  const rows = all.filter((p) => p.status !== "CREATED");
  const csv = [COLS.map((c) => esc(c[1])).join(","), ...rows.map((p) => COLS.map(([k]) => esc(p[k])).join(","))].join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payments.csv"',
      "Cache-Control": "no-store",
    },
  });
}
