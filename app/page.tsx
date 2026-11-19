import { config, parseAmount } from "@/lib/config";
import Checkout from "./Checkout";

export const dynamic = "force-dynamic";

// Optional prefill: https://yourdomain.com/?amount=50&desc=שיעור פרטי
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; desc?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="wrap">
      <Checkout
        clientId={config.clientId}
        currency={config.currency}
        initialAmount={parseAmount(sp.amount) ?? ""}
        description={(sp.desc ?? "").slice(0, 120)}
        businessName={config.businessName}
      />
    </main>
  );
}
