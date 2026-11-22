import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { apiBase, config, env } from "@/lib/config";
import { explain, recentPayPalErrors } from "@/lib/paypal";
import { getSettings } from "@/lib/settings";
import AdminNav from "../AdminNav";
import CheckButton from "./CheckButton";

export const dynamic = "force-dynamic";

export default async function PayPalPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const settings = await getSettings();
  const errors = await recentPayPalErrors();
  const rawEnv = env("PAYPAL_ENV");
  const secret = config.secret;

  const rows: [string, React.ReactNode][] = [
    ["סביבה (PAYPAL_ENV)", <>{config.env === "live" ? "Live – תשלומים אמיתיים" : "Sandbox – בדיקות בלבד"} <span className="hint">(ערך שהוגדר: {rawEnv || "ריק"})</span></>],
    ["שרת PayPal", <span dir="ltr" key="h">{apiBase()}</span>],
    ["Client ID (בכפתור ובשרת)", config.clientId ? <code dir="ltr" key="c">{config.clientId}</code> : <b className="bad">לא הוגדר</b>],
    ["Client Secret", secret ? <span dir="ltr" key="s">••••••••{secret.slice(-4)}</span> : <b className="bad">לא הוגדר</b>],
    ["מטבע", settings.currency],
    ["קידומת טבלאות (DB_TABLE_PREFIX)", env("DB_TABLE_PREFIX") ? <span dir="ltr" key="p">{env("DB_TABLE_PREFIX")}</span> : <span className="hint">ללא</span>],
  ];

  return (
    <main className="admin">
      <AdminNav active="paypal" />
      <div className="settings">
        <section className="panel">
          <h2>הגדרות PayPal של האתר הזה</h2>
          <table className="kv">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}><th>{k}</th><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            השוו את ה-Client ID ואת 4 התווים האחרונים של ה-Secret למה שמופיע ב-developer.paypal.com → Apps &amp; Credentials,
            ושימו לב שהמתג שם (Sandbox/Live) תואם לסביבה שלמעלה.
          </p>
        </section>

        <section className="panel">
          <h2>בדיקת חיבור</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            הבדיקה מתחברת ל-PayPal עם הפרטים שלמעלה ויוצרת הזמנת בדיקה של 1.00 {settings.currency}.
            ההזמנה לא מאושרת ולכן <b>לא מחויבת</b> ונמחקת אוטומטית אצל PayPal.
          </p>
          <CheckButton />
        </section>

        <section className="panel">
          <h2>שגיאות PayPal אחרונות</h2>
          {errors.length === 0 ? (
            <p className="hint">אין שגיאות רשומות.</p>
          ) : (
            <div className="scroll">
              <table>
                <thead><tr><th>זמן</th><th>שלב</th><th>קוד</th><th>פירוט</th><th>הסבר</th></tr></thead>
                <tbody>
                  {errors.map((e, i) => (
                    <tr key={i}>
                      <td>{new Date(e.at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</td>
                      <td>{{ auth: "התחברות", create: "יצירת הזמנה", capture: "חיוב", network: "רשת" }[e.step] ?? e.step}</td>
                      <td dir="ltr" className="ltr"><code>{e.code}</code>{e.status ? ` (${e.status})` : ""}</td>
                      <td dir="ltr" className="ltr wrap">{e.detail}{e.debugId && <div className="hint">debug_id: {e.debugId}</div>}</td>
                      <td className="wrap">{explain(e.code) ?? <span className="hint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="hint">את ה-debug_id אפשר למסור לתמיכה של PayPal כדי שיבדקו בדיוק מה קרה.</p>
        </section>
      </div>
    </main>
  );
}
