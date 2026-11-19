import { listPayments } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const showAll = (await searchParams).all === "1";
  const all = await listPayments();
  const rows = showAll ? all : all.filter((p) => p.status !== "CREATED");
  const completed = all.filter((p) => p.status === "COMPLETED");
  const totals = completed.reduce<Record<string, number>>((acc, p) => {
    acc[p.currency] = (acc[p.currency] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  return (
    <main className="admin">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Payments</h1>
        <form method="post" action="/api/admin/logout">
          <button className="btn btn-outline" type="submit">Log out</button>
        </form>
      </div>
      <div className="stats">
        <div className="stat">Completed<b>{completed.length}</b></div>
        {Object.entries(totals).map(([cur, sum]) => (
          <div className="stat" key={cur}>Total {cur}<b>{sum.toFixed(2)}</b></div>
        ))}
      </div>
      <p className="hint">
        {showAll ? <a href="/admin">Hide abandoned checkouts</a> : <a href="/admin?all=1">Show abandoned checkouts too</a>}
        {" · "}<a href="/admin/export">Download CSV</a>
      </p>
      <div className="scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Name</th><th>Email</th><th>Phone</th><th>Amount</th><th>Status</th><th>Note</th><th>PayPal ref</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8}>No payments yet.</td></tr>}
            {rows.map((p) => (
              <tr key={p.orderId}>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>{p.name}</td>
                <td>{p.email}{p.payerEmail && p.payerEmail !== p.email && <div className="hint">PayPal: {p.payerEmail}</div>}</td>
                <td>{p.phone ?? ""}</td>
                <td>{p.amount} {p.currency}</td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td>{p.note ?? ""}</td>
                <td className="hint">{p.captureId ?? p.orderId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
