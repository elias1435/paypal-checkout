# PayPal payment link (Next.js)

Payment page + password-protected admin list. Card details are handled entirely by
PayPal; this app stores only name, email, phone, amount, status and the PayPal reference.

## Setup
1. `cp .env.example .env.local` and fill in your PayPal Client ID + Secret and admin password.
2. `npm install && npm run build && npm start`

## Links
- Payment link: `https://yourdomain.com/?amount=50&desc=Consultation`
  (no `amount` = DEFAULT_AMOUNT). The amount is checked on the server against MIN/MAX_AMOUNT.
- Admin: `https://yourdomain.com/admin` (browser login prompt, ADMIN_USER / ADMIN_PASSWORD)
- CSV export: `/admin/export`

## Going live
Set `PAYPAL_ENV=live` and use the **Live** credentials (toggle "Live" in the PayPal developer dashboard).
Data is kept in `data/payments.json`, so back it up and keep it out of git.
