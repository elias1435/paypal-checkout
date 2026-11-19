"use client";

import { useRef, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

type Props = {
  clientId: string;
  currency: string;
  initialAmount: string;
  minAmount: number;
  maxAmount: number;
  description: string;
  businessName: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Checkout(props: Props) {
  const { clientId, currency, minAmount, maxAmount, description, businessName } = props;
  const [form, setForm] = useState({ name: "", email: "", phone: "", amount: props.initialAmount });
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | string>(null);
  // PayPal callbacks are created once; keep the latest form values in a ref.
  const formRef = useRef(form);
  formRef.current = form;

  const amountNum = Number(form.amount);
  const amountOk =
    /^\d+(\.\d{1,2})?$/.test(form.amount.trim()) && amountNum >= minAmount && amountNum <= maxAmount;
  const valid = form.name.trim() !== "" && EMAIL.test(form.email.trim()) && amountOk;
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  if (done) {
    return (
      <div className="card done">
        <div className="big">✓</div>
        <h2>Payment received</h2>
        <p className="hint">Thank you, {form.name}. PayPal will email you a receipt.</p>
        <p className="hint">Reference: {done}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="head">{businessName}</div>
      <div className="secure">🔒 Secure payment via PayPal</div>
      <div className="body">
        {description && <p style={{ marginTop: 0 }}>{description}</p>}

        <label htmlFor="amount">Amount ({currency}) *</label>
        <input
          id="amount"
          inputMode="decimal"
          placeholder={`${minAmount} – ${maxAmount}`}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })}
        />
        {form.amount !== "" && !amountOk && (
          <div className="err">
            Enter an amount between {fmt(minAmount)} and {fmt(maxAmount)}.
          </div>
        )}

        <label htmlFor="name">Full name *</label>
        <input id="name" autoComplete="name" maxLength={100} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label htmlFor="email">Email *</label>
        <input id="email" type="email" autoComplete="email" maxLength={200} value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label htmlFor="phone">Phone</label>
        <input id="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <div className="total">
          <span>Total</span>
          <span>{amountOk ? fmt(amountNum) : "—"}</span>
        </div>

        {error && <div className="err">{error}</div>}
        {!valid && <p className="hint">Fill in the amount, your name and email to continue.</p>}

        <PayPalScriptProvider options={{ clientId, currency, intent: "capture", components: "buttons" }}>
          <PayPalButtons
            disabled={!valid}
            forceReRender={[valid]}
            style={{ layout: "vertical", shape: "rect", label: "pay" }}
            createOrder={async () => {
              setError("");
              const { name, email, phone, amount } = formRef.current;
              const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, amount, note: description }),
              });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error ?? "Something went wrong");
                throw new Error(data.error);
              }
              return data.id;
            }}
            onApprove={async ({ orderID }) => {
              const res = await fetch(`/api/orders/${orderID}/capture`, { method: "POST" });
              const data = await res.json();
              if (res.ok && data.status === "COMPLETED") setDone(orderID);
              else if (res.ok && data.status === "PENDING") setDone(`${orderID} (pending review by PayPal)`);
              else setError(data.error ?? "Payment was declined. Please try another method.");
            }}
            onError={() => setError("Payment failed. Please try again.")}
          />
        </PayPalScriptProvider>
        <p className="hint" style={{ textAlign: "center" }}>
          Card details are entered on PayPal&apos;s secure form and never stored on this site.
        </p>
      </div>
    </div>
  );
}
