const scope = "white-glove:private-booking:";
export const BOOKING_PASSWORD_KEY = scope + "password";
export const BOOKING_GUEST_KEY = scope + "guest";

export function bookingStorageConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function bookingStorage<T>(...args: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Booking storage unavailable.");
  const response = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Booking storage unavailable.");
  const data = await response.json() as { result?: T; error?: string };
  if (data.error || data.result === undefined) throw new Error("Booking storage unavailable.");
  return data.result;
}
