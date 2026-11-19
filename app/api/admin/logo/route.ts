import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/admin-api";
import { LOGO_MAX_BYTES, clearLogo, detectImage, getSettings, saveLogo } from "@/lib/settings";

export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  const file = form?.get("logo");
  if (!(file instanceof File)) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
  if (file.size > LOGO_MAX_BYTES) return NextResponse.json({ error: "הקובץ גדול מ-2MB" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImage(bytes);
  if (!mime) return NextResponse.json({ error: "יש להעלות תמונה מסוג PNG, JPG או WEBP" }, { status: 400 });

  try {
    await saveLogo(bytes, mime);
    return NextResponse.json({ ok: true, logoVersion: (await getSettings()).logoVersion });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "השמירה נכשלה (בעיה במסד הנתונים)" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  await clearLogo();
  return NextResponse.json({ ok: true });
}
