"use client";

import { useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import type { Settings } from "@/lib/settings-schema";
import BrandHeader from "./BrandHeader";

type Props = {
  clientId: string;
  settings: Settings;
  logoUrl: string | null;
  initialAmount: string;
  description: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 999999.99;

export default function Checkout({ clientId, settings, logoUrl, initialAmount, description }: Props) {
  const { currency, texts: t, showPhone } = settings;
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: initialAmount });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | string>(null);
  // PayPal callbacks are created once; keep the latest form values in a ref.
  const formRef = useRef(form);
  formRef.current = form;

  const amountNum = Number(form.amount);
  const amountOk = /^\d+(\.\d{1,2})?$/.test(form.amount.trim()) && amountNum > 0 && amountNum <= MAX;
  const nameOk = form.name.trim() !== "";
  const emailOk = EMAIL.test(form.email.trim());
  const valid = amountOk && nameOk && emailOk;
  const money = new Intl.NumberFormat("he-IL", { style: "currency", currency });
  const symbol = money.formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: k === "amount" ? e.target.value.replace(/[^\d.]/g, "") : e.target.value });
  const blur = (k: string) => () => setTouched({ ...touched, [k]: true });
  const brand = { "--accent": settings.colorFrom, "--accent-2": settings.colorTo } as React.CSSProperties;

  if (done) {
    return (
      <div className="card done" style={brand}>
        <svg className="check" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" />
          <path d="M14 27 l8 8 l16 -18" />
        </svg>
        <h2>{t.successTitle}</h2>
        <p className="hint">{t.successMessage.replace(/\{name\}/g, form.name.trim())}</p>
        <p className="ref">{t.referenceLabel} <span dir="ltr">{done}</span></p>
      </div>
    );
  }

  return (
    <div className="card" style={brand}>
      <BrandHeader settings={settings} logoUrl={logoUrl} description={description} />
      <div className="secure">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" /></svg>
        {t.secureBadge}
      </div>

      <div className="body">
        <div className="amount-box">
          <label htmlFor="amount">{t.amountLabel}</label>
          <div className="amount-input">
            <span className="cur">{symbol}</span>
            <input id="amount" inputMode="decimal" placeholder={t.amountPlaceholder} autoComplete="off" dir="ltr"
              value={form.amount} onChange={set("amount")} onBlur={blur("amount")} />
          </div>
          {touched.amount && !amountOk && <div className="field-err">{t.amountError}</div>}
        </div>

        <div className="field">
          <label htmlFor="name">{t.nameLabel} <span className="req">*</span></label>
          <input id="name" autoComplete="name" maxLength={100} placeholder={t.namePlaceholder}
            value={form.name} onChange={set("name")} onBlur={blur("name")} />
          {touched.name && !nameOk && <div className="field-err">{t.nameError}</div>}
        </div>

        <div className="field">
          <label htmlFor="email">{t.emailLabel} <span className="req">*</span></label>
          <input id="email" type="email" autoComplete="email" maxLength={200} dir="ltr" placeholder={t.emailPlaceholder}
            value={form.email} onChange={set("email")} onBlur={blur("email")} />
          {touched.email && !emailOk && <div className="field-err">{t.emailError}</div>}
        </div>

        {showPhone && (
          <div className="field">
            <label htmlFor="phone">{t.phoneLabel} <span className="opt">{t.optionalText}</span></label>
            <input id="phone" type="tel" autoComplete="tel" maxLength={30} dir="ltr" placeholder={t.phonePlaceholder}
              value={form.phone} onChange={set("phone")} />
          </div>
        )}

        <div className="total">
          <span>{t.totalLabel}</span>
          <span key={amountOk ? form.amount : "none"} className="total-value">{money.format(amountOk ? amountNum : 0)}</span>
        </div>

        {error && <div className="err" role="alert">{error}</div>}

        <div className={`paypal ${valid ? "" : "locked"}`}>
          {!valid && <p className="hint center">{t.fillHint}</p>}
          <PayPalScriptProvider options={{ clientId, currency, intent: "capture", components: "buttons", locale: "he_IL" }}>
            <PayPalButtons
              disabled={!valid}
              forceReRender={[valid]}
              style={{ layout: "vertical", shape: "pill", label: "pay", height: 48 }}
              createOrder={async () => {
                setError("");
                const { name, email, phone, amount } = formRef.current;
                const res = await fetch("/api/orders", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email, phone: showPhone ? phone : "", amount, note: description }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(data.error ?? t.failedError);
                  throw new Error(data.error);
                }
                return data.id;
              }}
              onApprove={async ({ orderID }) => {
                const res = await fetch(`/api/orders/${orderID}/capture`, { method: "POST" });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.status === "COMPLETED") setDone(orderID);
                else if (res.ok && data.status === "PENDING") setDone(`${orderID} (ממתין לאישור PayPal)`);
                else setError(data.error ?? t.declinedError);
              }}
              onError={() => setError(t.failedError)}
            />
          </PayPalScriptProvider>
        </div>

        <p className="foot">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 10V7a5 5 0 0 0-10 0v3H5v12h14V10h-2Zm-8 0V7a3 3 0 0 1 6 0v3H9Z" /></svg>
          {t.footerNote}
        </p>
      </div>
    </div>
  );
}
