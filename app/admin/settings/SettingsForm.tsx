"use client";

import { useRef, useState } from "react";
import { CURRENCIES, DEFAULT_SETTINGS, Settings, TEXT_FIELDS, TextKey } from "@/lib/settings-schema";
import BrandHeader from "../../BrandHeader";

type Props = { initial: Settings; initialLogoVersion: string | null; adminUser: string; usingEnvLogin: boolean };
type Toast = { kind: "ok" | "err"; msg: string } | null;

const CURRENCY_NAMES: Record<string, string> = { ILS: "₪ שקל", USD: "$ דולר", EUR: "€ אירו", GBP: "£ ליש\"ט" };
const LOGO_MODES = [
  { value: "icon", title: "לוגו קטן", desc: "הלוגו מעל שם האתר" },
  { value: "banner", title: "תמונה מלאה", desc: "התמונה ממלאת את כל הכותרת" },
  { value: "none", title: "ללא לוגו", desc: "רק שם האתר" },
] as const;

async function send(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
  return data;
}

export default function SettingsForm({ initial, initialLogoVersion, adminUser, usingEnvLogin }: Props) {
  const [s, setS] = useState<Settings>(initial);
  const [logoVersion, setLogoVersion] = useState(initialLogoVersion);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [account, setAccount] = useState({ newUser: adminUser, newPassword: "", confirm: "", currentPassword: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const setText = (k: TextKey, v: string) => setS((prev) => ({ ...prev, texts: { ...prev.texts, [k]: v } }));
  const logoUrl = logoVersion ? `/api/logo?v=${logoVersion}` : null;

  async function save() {
    setSaving(true);
    try {
      const data = await send("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s),
      });
      setS(data.settings);
      notify("ok", "ההגדרות נשמרו");
    } catch (e) {
      notify("err", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) return notify("err", "הקובץ גדול מ-2MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const data = await send("/api/admin/logo", { method: "POST", body: fd });
      setLogoVersion(data.logoVersion);
      notify("ok", "הלוגו הועלה");
    } catch (e) {
      notify("err", (e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!confirm("למחוק את הלוגו?")) return;
    try {
      await send("/api/admin/logo", { method: "DELETE" });
      setLogoVersion(null);
      notify("ok", "הלוגו נמחק");
    } catch (e) {
      notify("err", (e as Error).message);
    }
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (account.newPassword !== account.confirm) return notify("err", "הסיסמאות החדשות אינן תואמות");
    try {
      await send("/api/admin/account", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: account.currentPassword, newUser: account.newUser, newPassword: account.newPassword }),
      });
      setAccount({ ...account, newPassword: "", confirm: "", currentPassword: "" });
      notify("ok", "פרטי ההתחברות עודכנו");
    } catch (e) {
      notify("err", (e as Error).message);
    }
  }

  return (
    <div className="settings">
      {/* ---------- Branding ---------- */}
      <section className="panel">
        <h2>מיתוג</h2>
        <div className="settings-grid">
          <div>
            <div className="field">
              <label htmlFor="siteName">שם האתר</label>
              <input id="siteName" value={s.siteName} maxLength={80} onChange={(e) => update("siteName", e.target.value)} />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={s.showSiteName} onChange={(e) => update("showSiteName", e.target.checked)} />
              הצג את שם האתר בכותרת
            </label>
            <div className="field">
              <label htmlFor="subtitle">כותרת משנה <span className="opt">(לא חובה)</span></label>
              <input id="subtitle" value={s.subtitle} maxLength={120} placeholder="לדוגמה: הפקות קולנוע וטלוויזיה"
                onChange={(e) => update("subtitle", e.target.value)} />
            </div>

            <label>לוגו</label>
            <div className="logo-row">
              <div className="logo-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl ? <img src={logoUrl} alt="לוגו" /> : <span className="hint">אין לוגו</span>}
              </div>
              <div className="logo-actions">
                <button type="button" className="btn btn-outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "מעלה..." : logoUrl ? "החלפת תמונה" : "העלאת תמונה"}
                </button>
                {logoUrl && <button type="button" className="btn btn-outline danger" onClick={removeLogo}>מחיקה</button>}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              </div>
            </div>
            <p className="hint">PNG, JPG או WEBP, עד 2MB. התמונה נשמרת במסד הנתונים מיד.</p>

            <label>תצוגת הלוגו</label>
            <div className="mode-grid">
              {LOGO_MODES.map((m) => (
                <label key={m.value} className={`mode ${s.logoMode === m.value ? "on" : ""}`}>
                  <input type="radio" name="logoMode" value={m.value} checked={s.logoMode === m.value}
                    onChange={() => setS((prev) => ({ ...prev, logoMode: m.value, showSiteName: m.value === "banner" ? false : prev.showSiteName }))} />
                  <b>{m.title}</b>
                  <span>{m.desc}</span>
                </label>
              ))}
            </div>

            <div className="color-row">
              <div className="field">
                <label htmlFor="colorFrom">צבע ראשי</label>
                <input id="colorFrom" type="color" value={s.colorFrom} onChange={(e) => update("colorFrom", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="colorTo">צבע משני</label>
                <input id="colorTo" type="color" value={s.colorTo} onChange={(e) => update("colorTo", e.target.value)} />
              </div>
              <button type="button" className="link-btn" onClick={() => setS((p) => ({ ...p, colorFrom: DEFAULT_SETTINGS.colorFrom, colorTo: DEFAULT_SETTINGS.colorTo }))}>
                איפוס צבעים
              </button>
            </div>
          </div>

          <div className="preview">
            <span className="hint">תצוגה מקדימה</span>
            <div className="card preview-card" style={{ "--accent": s.colorFrom, "--accent-2": s.colorTo } as React.CSSProperties}>
              <BrandHeader settings={s} logoUrl={logoUrl} />
              <div className="secure">{s.texts.secureBadge}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Payment ---------- */}
      <section className="panel">
        <h2>תשלום</h2>
        <div className="settings-grid">
          <div className="field">
            <label htmlFor="currency">מטבע</label>
            <select id="currency" value={s.currency} onChange={(e) => update("currency", e.target.value as Settings["currency"])}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_NAMES[c]} ({c})</option>)}
            </select>
          </div>
          <label className="check-row" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={s.showPhone} onChange={(e) => update("showPhone", e.target.checked)} />
            הצג שדה טלפון בטופס
          </label>
        </div>
      </section>

      {/* ---------- Texts ---------- */}
      <section className="panel">
        <div className="panel-head">
          <h2>טקסטים בטופס</h2>
          <button type="button" className="link-btn" onClick={() => confirm("לאפס את כל הטקסטים לברירת המחדל?") && update("texts", DEFAULT_SETTINGS.texts)}>
            איפוס לברירת מחדל
          </button>
        </div>
        <div className="texts-grid">
          {TEXT_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={`t-${f.key}`}>{f.label}</label>
              <input id={`t-${f.key}`} value={s.texts[f.key]} maxLength={300} placeholder={f.def}
                onChange={(e) => setText(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <div className="save-bar">
        <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? "שומר..." : "שמירת הגדרות"}</button>
      </div>

      {/* ---------- Account ---------- */}
      <section className="panel">
        <h2>פרטי התחברות</h2>
        {usingEnvLogin && (
          <p className="notice">כרגע ההתחברות מתבססת על ADMIN_USER / ADMIN_PASSWORD ממשתני הסביבה. אחרי שמירה כאן, הפרטים החדשים יחליפו אותם.</p>
        )}
        <form className="settings-grid" onSubmit={saveAccount} autoComplete="off">
          <div className="field">
            <label htmlFor="newUser">שם משתמש</label>
            <input id="newUser" dir="ltr" required minLength={3} autoComplete="username" value={account.newUser}
              onChange={(e) => setAccount({ ...account, newUser: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="currentPassword">סיסמה נוכחית <span className="req">*</span></label>
            <input id="currentPassword" type="password" dir="ltr" required autoComplete="current-password" value={account.currentPassword}
              onChange={(e) => setAccount({ ...account, currentPassword: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="newPassword">סיסמה חדשה <span className="opt">(השאירו ריק כדי לא לשנות)</span></label>
            <input id="newPassword" type="password" dir="ltr" minLength={10} autoComplete="new-password" value={account.newPassword}
              onChange={(e) => setAccount({ ...account, newPassword: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="confirm">אימות סיסמה חדשה</label>
            <input id="confirm" type="password" dir="ltr" autoComplete="new-password" value={account.confirm}
              onChange={(e) => setAccount({ ...account, confirm: e.target.value })} />
          </div>
          <div>
            <button className="btn" type="submit">עדכון פרטי התחברות</button>
            <p className="hint">סיסמה של 10 תווים לפחות. העדכון מנתק חיבורים אחרים.</p>
          </div>
        </form>
      </section>

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.msg}</div>}
    </div>
  );
}
