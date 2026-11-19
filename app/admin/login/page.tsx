import { redirect } from "next/navigation";
import { MIN_PASSWORD, adminConfigProblem, isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; locked?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const sp = await searchParams;
  const problem = await adminConfigProblem();
  return (
    <main className="wrap">
      <form className="card" method="post" action="/api/admin/login">
        <div className="head">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M17 10V7a5 5 0 0 0-10 0v3H5v12h14V10h-2Zm-8 0V7a3 3 0 0 1 6 0v3H9Z" /></svg>
          </div>
          <h1>כניסת מנהל</h1>
        </div>
        <div className="body">
          {problem === "db" && <div className="err">לא ניתן להתחבר למסד הנתונים. יש לבדוק את משתני DB_* ולפרסם מחדש.</div>}
          {problem === "missing" && <div className="err">ADMIN_USER / ADMIN_PASSWORD לא הוגדרו בשרת.</div>}
          {problem === "short" && <div className="err">הסיסמה שהוגדרה בשרת (ADMIN_PASSWORD) קצרה מ-{MIN_PASSWORD} תווים. יש להגדיר סיסמה ארוכה יותר ולפרסם מחדש.</div>}
          {!problem && sp.error && <div className="err">שם משתמש או סיסמה שגויים.</div>}
          {sp.locked && <div className="err">יותר מדי ניסיונות. נסו שוב בעוד 15 דקות.</div>}
          <div className="field">
            <label htmlFor="username">שם משתמש</label>
            <input id="username" name="username" autoComplete="username" dir="ltr" required />
          </div>
          <div className="field">
            <label htmlFor="password">סיסמה</label>
            <input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required />
          </div>
          <button className="btn" type="submit">כניסה</button>
        </div>
      </form>
    </main>
  );
}
