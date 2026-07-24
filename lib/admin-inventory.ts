import { inventoryItems, type InventoryItem, type InventoryStatus } from "@/data/page-inventory";

type RedisResult<T> = { result?: T };

export type InventoryOverride = {
  status?: InventoryStatus;
  ownerNotes?: string;
  updatedAt?: string;
};

export type EditableInventoryItem = InventoryItem & InventoryOverride;

const overridesKey = "white-glove:inventory-overrides";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: string) {
  const config = redisConfig();
  if (!config) return undefined;
  try {
    const response = await fetch(`${config.url}/${command}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    return (await response.json()) as RedisResult<T>;
  } catch {
    return undefined;
  }
}

function parseOverrides(value: unknown): Record<string, InventoryOverride> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as Record<string, InventoryOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function inventoryStorageIsConfigured() {
  return Boolean(redisConfig());
}

export async function getInventoryOverrides() {
  const response = await redis<string>(`get/${encodeURIComponent(overridesKey)}`);
  return parseOverrides(response?.result);
}

export async function getEditableInventory(): Promise<{ configured: boolean; items: EditableInventoryItem[] }> {
  const configured = inventoryStorageIsConfigured();
  const overrides = configured ? await getInventoryOverrides() : {};
  return {
    configured,
    items: inventoryItems.map((item) => ({ ...item, ...overrides[item.id] })),
  };
}

export async function saveInventoryOverride(id: string, override: InventoryOverride) {
  if (!inventoryStorageIsConfigured()) return false;
  if (!inventoryItems.some((item) => item.id === id)) return false;
  const overrides = await getInventoryOverrides();
  const next: Record<string, InventoryOverride> = {
    ...overrides,
    [id]: {
      ...overrides[id],
      ...override,
      ownerNotes: override.ownerNotes?.slice(0, 1200),
      updatedAt: new Date().toISOString(),
    },
  };
  const payload = encodeURIComponent(JSON.stringify(next));
  const response = await redis(`set/${encodeURIComponent(overridesKey)}/${payload}`);
  return Boolean(response);
}
