import Link from "next/link";

export default function AdminNav({ active }: { active: "payments" | "settings" | "paypal" }) {
  return (
    <div className="admin-top">
      <nav className="tabs">
        <Link href="/admin" className={active === "payments" ? "tab active" : "tab"}>תשלומים</Link>
        <Link href="/admin/settings" className={active === "settings" ? "tab active" : "tab"}>הגדרות</Link>
        <Link href="/admin/paypal" className={active === "paypal" ? "tab active" : "tab"}>בדיקת PayPal</Link>
        <a href="/" target="_blank" rel="noopener" className="tab">צפייה בעמוד ↗</a>
      </nav>
      <form method="post" action="/api/admin/logout">
        <button className="btn btn-outline" type="submit">התנתקות</button>
      </form>
    </div>
  );
}
