import { getLogo } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Public logo image. URLs carry ?v=<version>, so it can be cached for a long time.
export async function GET() {
  const logo = await getLogo().catch(() => null);
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
