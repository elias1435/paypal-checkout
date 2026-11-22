import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { explain, runConnectionCheck } from "@/lib/paypal";
import { getSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const denied = await guardAdmin(req, { json: true });
  if (denied) return denied;
  const steps = await runConnectionCheck((await getSettings()).currency);
  return NextResponse.json({ steps: steps.map((s) => ({ ...s, explanation: s.code ? explain(s.code) : null })) });
}
