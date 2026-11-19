# PayPal payment page (Next.js)

Hebrew (RTL) payment page where customers type the amount and pay with PayPal or a card, plus a
login-protected admin area. Card details are handled entirely by PayPal; this app
stores only name, email, phone, amount, status and the PayPal reference.

## Setup
1. Copy `.env.example` to `.env.local` (or add the same keys as environment variables in Hostinger).
2. `npm install && npm run build && npm start`

## Pages
- Payment page: `https://yourdomain.com/` (optional prefill: `/?amount=50&desc=Consultation`)
- Admin: `https://yourdomain.com/admin` → redirects to the login page
- CSV export: `/admin/export` (logged in only)

## Storage
In production set the `DB_*` variables (MySQL). The table is created automatically.
Without them, payments go to `data/payments.json`, which is for local testing only
and is **lost on every Hostinger deploy**.

## Security
- Card data never touches this server (PayPal-hosted fields).
- Admin: signed httpOnly session cookie (8h), SameSite=Strict, 5 login attempts / 15 min per IP.
  The password must be at least 10 characters (the login page says so if not).
- Rate limits and cross-site checks (Sec-Fetch-Site, proxy-safe) on payment endpoints; amount validated on the server.
- Security headers: CSP (self + PayPal only), HSTS, no framing, nosniff.

## Going live
Set `PAYPAL_ENV=live` (or `production`) and use the **Live** Client ID + Secret.
