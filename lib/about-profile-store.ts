/**
 * Where the About personal profile is kept — Redis, own key, cache-tagged.
 */

import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { EMPTY_ABOUT_PROFILE, type AboutProfile } from "@/data/about-profile";
import { mergeAboutProfile, onlyFilledAbout, type StoredAboutProfile } from "@/lib/about-profile";

const KEY = "white-glove:about-profile";
export const ABOUT_PROFILE_TAG = "about-profile";

export function aboutProfileStoreAvailable() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redis<T>(path: string, body?: string): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { result?: T };
    return payload.result ?? null;
  } catch {
    return null;
  }
}

async function readStored(): Promise<StoredAboutProfile> {
  const raw = await redis<string>(`get/${KEY}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as StoredAboutProfile;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const cached = unstable_cache(
  async (): Promise<AboutProfile> => mergeAboutProfile(await readStored()),
  ["about-profile"],
  { tags: [ABOUT_PROFILE_TAG], revalidate: 3600 },
);

export async function readAboutProfile(): Promise<AboutProfile> {
  if (!aboutProfileStoreAvailable()) return { ...EMPTY_ABOUT_PROFILE };
  return cached();
}

export async function readAboutProfileFresh(): Promise<AboutProfile> {
  if (!aboutProfileStoreAvailable()) return { ...EMPTY_ABOUT_PROFILE };
  return mergeAboutProfile(await readStored());
}

function everythingIsStale() {
  updateTag(ABOUT_PROFILE_TAG);
  revalidatePath("/about");
  revalidatePath("/admin/settings/about");
}

export async function saveAboutProfile(next: AboutProfile): Promise<{ ok: boolean; message: string }> {
  if (!aboutProfileStoreAvailable()) {
    return { ok: false, message: "This needs the private store connected." };
  }
  const changes = onlyFilledAbout(next);
  if (Object.keys(changes).length === 0) {
    if ((await redis(`del/${KEY}`)) === null) return { ok: false, message: "Could not clear. Try again." };
  } else if ((await redis(`set/${KEY}`, JSON.stringify(changes))) === null) {
    return { ok: false, message: "Could not save. Try again." };
  }
  everythingIsStale();
  const count = Object.keys(changes).length;
  return {
    ok: true,
    message: count === 0 ? "Personal details cleared — the About page shows only the general introduction." : "Saved. The About page will show what you filled in.",
  };
}
