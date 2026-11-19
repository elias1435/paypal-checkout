export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; locked?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="wrap">
      <form className="card" method="post" action="/api/admin/login">
        <div className="head">Admin login</div>
        <div className="body">
          {sp.error && <div className="err">Wrong username or password.</div>}
          {sp.locked && <div className="err">Too many attempts. Try again in 15 minutes.</div>}
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button className="btn" type="submit">Log in</button>
        </div>
      </form>
    </main>
  );
}
