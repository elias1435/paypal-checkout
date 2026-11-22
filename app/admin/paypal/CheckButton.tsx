"use client";

import { useState } from "react";

type Step = { name: string; ok: boolean; info: string; code?: string; explanation?: string | null };
const NAMES: Record<string, string> = { auth: "התחברות ל-PayPal (Client ID + Secret)", order: "יצירת הזמנת בדיקה" };

export default function CheckButton() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    setSteps(null);
    try {
      const res = await fetch("/api/admin/paypal-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "הבדיקה נכשלה");
      setSteps(data.steps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const allOk = steps && steps.length === 2 && steps.every((s) => s.ok);
  return (
    <div>
      <button className="btn" style={{ width: "auto", padding: "12px 28px" }} disabled={running} onClick={run}>
        {running ? "בודק..." : "הרצת בדיקה"}
      </button>
      {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}
      {steps && (
        <ul className="checks">
          {steps.map((s) => (
            <li key={s.name} className={s.ok ? "ok" : "fail"}>
              <b>{s.ok ? "✓" : "✗"} {NAMES[s.name] ?? s.name}</b>
              {s.info && <div dir="ltr" className="ltr hint">{s.info}</div>}
              {s.explanation && <div className="why">{s.explanation}</div>}
            </li>
          ))}
          {allOk && (
            <li className="ok">
              <b>החיבור תקין.</b> אם תשלום אמיתי עדיין נכשל, הסיבה תופיע בטבלת התשלומים ובשגיאות למטה
              (למשל הגבלה בחשבון PayPal או כרטיס שנדחה).
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
