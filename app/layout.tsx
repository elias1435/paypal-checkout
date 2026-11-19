import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: process.env.BUSINESS_NAME ?? "תשלום מאובטח",
  robots: { index: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f4f8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
