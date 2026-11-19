import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: s.siteName,
    robots: { index: false },
    icons: s.logoVersion ? { icon: `/api/logo?v=${s.logoVersion}` } : undefined,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f4f8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
