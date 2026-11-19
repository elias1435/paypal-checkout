import { promises as fs } from "fs";
import path from "path";

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

const FILE = path.join(process.cwd(), "data", "payments.json");
let queue: Promise<unknown> = Promise.resolve();

export async function listPayments(): Promise<Payment[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

/** Insert or update by orderId. Writes are serialized and atomic. */
export function savePayment(p: Payment) {
  const job = queue.then(async () => {
    const all = await listPayments();
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
