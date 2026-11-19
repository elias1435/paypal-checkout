import { config, parseAmount } from "@/lib/config";
import Checkout from "./Checkout";

export const dynamic = "force-dynamic";

// Optional prefill: https://yourdomain.com/?amount=50&desc=Consultation
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; desc?: string }>;
}) {
  const sp = await searchParams;
  const amount = parseAmount(sp.amount) ?? parseAmount(config.defaultAmount) ?? "";
  return (
    <main className="wrap">
      <Checkout
        clientId={config.clientId}
        currency={config.currency}
        initialAmount={amount}
        minAmount={config.minAmount}
        maxAmount={config.maxAmount}
        description={(sp.desc ?? "").slice(0, 120)}
        businessName={config.businessName}
      />
    </main>
  );
}
