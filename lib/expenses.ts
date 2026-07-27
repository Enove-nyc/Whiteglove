// Owner's private expense/finance log, stored in Redis (Upstash REST). Amounts
// are kept as integer cents to avoid floating-point rounding.

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amountCents: number;
  currency: string; // e.g. "USD"
  category: string;
  notes?: string;
  createdAt: string;
};

const KEY = "white-glove:expenses";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function expensesAvailable() {
  return Boolean(redisConfig());
}

async function redis<T>(command: string): Promise<{ result?: T } | undefined> {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const res = await fetch(`${config.url}/${command}`, { headers: { Authorization: `Bearer ${config.token}` }, cache: "no-store" });
    if (!res.ok) return undefined;
    return (await res.json()) as { result?: T };
  } catch {
    return undefined;
  }
}

export async function listExpenses(): Promise<Expense[]> {
  const res = await redis<string>(`get/${encodeURIComponent(KEY)}`);
  if (!res?.result) return [];
  try {
    const parsed = JSON.parse(res.result) as Expense[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeExpenses(items: Expense[]) {
  const payload = encodeURIComponent(JSON.stringify(items.slice(0, 10000)));
  const res = await redis(`set/${encodeURIComponent(KEY)}/${payload}`);
  return Boolean(res);
}

export async function addExpense(input: Omit<Expense, "id" | "createdAt">): Promise<Expense | null> {
  if (!expensesAvailable()) return null;
  const items = await listExpenses();
  const expense: Expense = {
    ...input,
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const ok = await writeExpenses([expense, ...items]);
  return ok ? expense : null;
}

export async function deleteExpense(id: string): Promise<boolean> {
  if (!expensesAvailable()) return false;
  const items = await listExpenses();
  return writeExpenses(items.filter((e) => e.id !== id));
}

// Totals overall, by category, and by month — for the finances dashboard.
export function summarizeExpenses(items: Expense[]) {
  const byCurrency: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  for (const e of items) {
    byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.amountCents;
    byCategory[e.category || "Uncategorized"] = (byCategory[e.category || "Uncategorized"] ?? 0) + e.amountCents;
    const month = (e.date || "").slice(0, 7);
    if (month) byMonth[month] = (byMonth[month] ?? 0) + e.amountCents;
  }
  return { byCurrency, byCategory, byMonth };
}
