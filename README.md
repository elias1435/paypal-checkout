# PayPal payment page (Next.js)

Hebrew (RTL) payment page where customers type the amount and pay with PayPal or a card, plus a
login-protected admin area. Card details are handled entirely by PayPal; this app
stores only name, email, phone, amount, status and the PayPal reference.

## Setup
1. Copy `.env.example` to `.env.local` (or add the same keys as environment variables in Hostinger).
2. `npm install && npm run build && npm start`

## Admin settings (`/admin/settings`)
Everything visible is edited there and stored in MySQL: site name (show/hide), subtitle,
logo upload (PNG/JPG/WEBP, max 2MB) with three display modes (small logo, full-width
image header, no logo), brand colors, currency, phone field on/off, every text on the
form, and the admin username/password (hashed with scrypt).

## Pages
- Payment page: `https://yourdomain.com/` (optional prefill: `/?amount=50&desc=Consultation`)
- Admin: `https://yourdomain.com/admin` → redirects to the login page
- CSV export: `/admin/export` (logged in only)

## Storage (payments, settings, logo, admin login)
In production set the `DB_*` variables (MySQL). The table is created automatically.
Without them, payments go to `data/payments.json`, which is for local testing only
and is **lost on every Hostinger deploy**.

## Security
- Card data never touches this server (PayPal-hosted fields).
- Admin: signed httpOnly session cookie (8h), SameSite=Strict, 5 login attempts / 15 min per IP.
  The password must be at least 10 characters (the login page says so if not).
- Rate limits and cross-site checks (Sec-Fetch-Site, proxy-safe) on payment endpoints; amount validated on the server.
- Security headers: CSP (self + PayPal only), HSTS, no framing, nosniff.

## Troubleshooting payments
Admin → "בדיקת PayPal" shows which environment/Client ID this site uses, runs a
connection test (token + an unapproved 1.00 test order, never charged), and lists the
last PayPal errors with PayPal's code, debug_id and a Hebrew explanation. Failed or
pending payments also show the reason in the payments table.

## Several sites, one database
Set a different `DB_TABLE_PREFIX` on each extra site (e.g. `site2_`), otherwise they
share payments, settings, logo and admin login.

## Going live
Set `PAYPAL_ENV=live` (or `production`) and use the **Live** Client ID + Secret.
