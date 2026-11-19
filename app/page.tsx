import { config, parseAmount } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import Checkout from "./Checkout";

export const dynamic = "force-dynamic";

// Optional prefill: https://yourdomain.com/?amount=50&desc=שיעור פרטי
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; desc?: string }>;
}) {
  const sp = await searchParams;
  const { logoVersion, ...settings } = await getSettings();
  return (
    <main className="wrap">
      <Checkout
        clientId={config.clientId}
        settings={settings}
        logoUrl={logoVersion ? `/api/logo?v=${logoVersion}` : null}
        initialAmount={parseAmount(sp.amount) ?? ""}
        description={(sp.desc ?? "").slice(0, 120)}
      />
    </main>
  );
}
