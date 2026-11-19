import { promises as fs } from "fs";
import path from "path";
import type { Pool } from "mysql2/promise";

// Only non-sensitive info. Card data never reaches this server — PayPal handles it.
export type Payment = {
  orderId: string;
  captureId?: string;
  status: string;
  amount: string;
  currency: string;
  name: string;
  email: string;
  phone?: string;
  note?: string;
  payerEmail?: string; // PayPal account email, if paid with PayPal
  createdAt: string;
};

const useMysql = () => Boolean(process.env.DB_HOST && process.env.DB_NAME);

// ---------- MySQL (production) ----------
let pool: Pool | null = null;
let ready: Promise<void> | null = null;

async function db(): Promise<Pool> {
  if (!pool) {
    const mysql = await import("mysql2/promise");
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 5,
      timezone: "Z",
      charset: "utf8mb4",
    });
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS payments (
          order_id    VARCHAR(64)  NOT NULL PRIMARY KEY,
          capture_id  VARCHAR(64)  NULL,
          status      VARCHAR(32)  NOT NULL,
          amount      DECIMAL(12,2) NOT NULL,
          currency    CHAR(3)      NOT NULL,
          name        VARCHAR(100) NOT NULL,
          email       VARCHAR(200) NOT NULL,
          phone       VARCHAR(30)  NULL,
          note        VARCHAR(300) NULL,
          payer_email VARCHAR(200) NULL,
          created_at  DATETIME(3)  NOT NULL,
          INDEX idx_created (created_at)
        ) CHARACTER SET utf8mb4`
      )
      .then(() =>
        pool!.query(
          `CREATE TABLE IF NOT EXISTS app_settings (
            k VARCHAR(50) NOT NULL PRIMARY KEY,
            v MEDIUMTEXT  NOT NULL
          ) CHARACTER SET utf8mb4`
        )
      )
      .then(() => undefined);
  }
  await ready;
  return pool;
}

type Row = Record<string, unknown>;
const fromRow = (r: Row): Payment => ({
  orderId: String(r.order_id),
  captureId: (r.capture_id as string) ?? undefined,
  status: String(r.status),
  amount: Number(r.amount).toFixed(2),
  currency: String(r.currency),
  name: String(r.name),
  email: String(r.email),
  phone: (r.phone as string) ?? undefined,
  note: (r.note as string) ?? undefined,
  payerEmail: (r.payer_email as string) ?? undefined,
  createdAt: new Date(r.created_at as string).toISOString(),
});

// ---------- JSON file (local development only) ----------
const DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DIR, "payments.json");
let queue: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<Payment[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

// ---------- Public API ----------
export async function listPayments(): Promise<Payment[]> {
  if (!useMysql()) return readFile();
  const [rows] = await (await db()).query("SELECT * FROM payments ORDER BY created_at DESC LIMIT 5000");
  return (rows as Row[]).map(fromRow);
}

export async function getPayment(orderId: string): Promise<Payment | undefined> {
  if (!useMysql()) return (await readFile()).find((p) => p.orderId === orderId);
  const [rows] = await (await db()).query("SELECT * FROM payments WHERE order_id = ?", [orderId]);
  const r = (rows as Row[])[0];
  return r ? fromRow(r) : undefined;
}

/** Insert or update by orderId. */
export async function savePayment(p: Payment): Promise<void> {
  if (useMysql()) {
    await (await db()).query(
      `INSERT INTO payments
        (order_id, capture_id, status, amount, currency, name, email, phone, note, payer_email, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        capture_id = VALUES(capture_id), status = VALUES(status), amount = VALUES(amount),
        currency = VALUES(currency), payer_email = VALUES(payer_email)`,
      [p.orderId, p.captureId ?? null, p.status, p.amount, p.currency, p.name, p.email,
       p.phone ?? null, p.note ?? null, p.payerEmail ?? null, new Date(p.createdAt)]
    );
    return;
  }
  const job = queue.then(async () => {
    const all = await readFile();
    const i = all.findIndex((x) => x.orderId === p.orderId);
    if (i >= 0) all[i] = { ...all[i], ...p };
    else all.unshift(p);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(all, null, 2));
    await fs.rename(tmp, FILE);
  });
  queue = job.catch(() => {});
  return job;
}

// ---------- Key/value settings ----------
const kvFile = (k: string) => path.join(DIR, `setting-${k.replace(/[^a-z0-9_-]/gi, "")}.json`);

export async function kvGet(k: string): Promise<string | null> {
  if (!useMysql()) return fs.readFile(kvFile(k), "utf8").catch(() => null);
  const [rows] = await (await db()).query("SELECT v FROM app_settings WHERE k = ?", [k]);
  const r = (rows as Row[])[0];
  return r ? String(r.v) : null;
}

/** Store a value; `null` clears the key. */
export async function kvSet(k: string, v: string | null): Promise<void> {
  if (!useMysql()) {
    await fs.mkdir(DIR, { recursive: true });
    if (v === null) await fs.unlink(kvFile(k)).catch(() => {});
    else await fs.writeFile(kvFile(k), v);
    return;
  }
  const pool = await db();
  if (v === null) await pool.query("DELETE FROM app_settings WHERE k = ?", [k]);
  else await pool.query("INSERT INTO app_settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", [k, v]);
}
