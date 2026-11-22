import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { listPayments } from "@/lib/store";
import { explain } from "@/lib/paypal";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  COMPLETED: "הושלם", PENDING: "ממתין", CREATED: "לא הושלם", FAILED: "נכשל", DECLINED: "נדחה",
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ all?: string; q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const showAll = sp.all === "1";
  const q = (sp.q ?? "").trim().toLowerCase();
  let all: Awaited<ReturnType<typeof listPayments>> = [];
  let dbError = "";
  try {
    all = await listPayments();
  } catch (e) {
    console.error(e);
    const code = (e as { code?: string }).code ?? "";
    dbError = code === "ER_ACCESS_DENIED_ERROR" ? "שם המשתמש או הסיסמה של מסד הנתונים שגויים (DB_USER / DB_PASSWORD)"
      : code === "ER_BAD_DB_ERROR" ? "מסד הנתונים לא נמצא (DB_NAME)"
      : code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT" ? "לא ניתן להתחבר לשרת מסד הנתונים (DB_HOST / DB_PORT)"
      : `שגיאת מסד נתונים${code ? ` (${code})` : ""}`;
  }
  let rows = showAll ? all : all.filter((p) => p.status !== "CREATED");
  if (q) rows = rows.filter((p) => [p.name, p.email, p.phone, p.payerEmail, p.orderId, p.captureId]
    .some((v) => v?.toLowerCase().includes(q)));
  const completed = all.filter((p) => p.status === "COMPLETED");
  const totals = completed.reduce<Record<string, number>>((acc, p) => {
    acc[p.currency] = (acc[p.currency] ?? 0) + Number(p.amount);
    return acc;
  }, {});
  const money = (n: number, cur: string) => new Intl.NumberFormat("he-IL", { style: "currency", currency: cur }).format(n);

  return (
    <main className="admin">
      <AdminNav active="payments" />

      {dbError && <div className="err">{dbError}. יש לבדוק את משתני הסביבה ולפרסם מחדש.</div>}

      <div className="stats">
        <div className="stat"><span>תשלומים שהושלמו</span><b>{completed.length}</b></div>
        {Object.entries(totals).map(([cur, sum]) => (
          <div className="stat" key={cur}><span>סה&quot;כ התקבל</span><b>{money(sum, cur)}</b></div>
        ))}
      </div>

      <div className="toolbar">
        <form method="get" className="search">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="חיפוש לפי שם, אימייל, טלפון..." />
          {showAll && <input type="hidden" name="all" value="1" />}
          <button className="btn btn-outline" type="submit">חיפוש</button>
        </form>
        <div className="links">
          {showAll ? <a href="/admin">הסתר תשלומים שלא הושלמו</a> : <a href="/admin?all=1">הצג גם תשלומים שלא הושלמו</a>}
          <a href="/admin/export">הורדת CSV</a>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr><th>תאריך</th><th>שם</th><th>אימייל</th><th>טלפון</th><th>סכום</th><th>סטטוס</th><th>הערה</th><th>אסמכתא PayPal</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="empty">אין תשלומים להצגה</td></tr>}
            {rows.map((p) => (
              <tr key={p.orderId}>
                <td>{new Date(p.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</td>
                <td>{p.name}</td>
                <td dir="ltr" className="ltr">{p.email}{p.payerEmail && p.payerEmail !== p.email && <div className="hint">PayPal: {p.payerEmail}</div>}</td>
                <td dir="ltr" className="ltr">{p.phone ?? ""}</td>
                <td>{money(Number(p.amount), p.currency)}</td>
                <td>
                  <span className={`badge ${p.status}`}>{STATUS[p.status] ?? p.status}</span>
                  {p.error && (
                    <div className="pay-err" title={explain(p.error.split(" ")[0]) ?? p.error}>
                      <code dir="ltr">{p.error.split(" ")[0]}</code>
                      {explain(p.error.split(" ")[0]) && <div>{explain(p.error.split(" ")[0])}</div>}
                    </div>
                  )}
                </td>
                <td>{p.note ?? ""}</td>
                <td dir="ltr" className="ltr hint">{p.captureId ?? p.orderId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
