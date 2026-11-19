import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { saveSettings } from "@/lib/settings";

export async function POST(req: Request) {
  const denied = await guardAdmin(req, { json: true });
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, settings: await saveSettings(body) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "השמירה נכשלה (בעיה במסד הנתונים)" }, { status: 500 });
  }
}
