/**
 * Rules for the About personal profile — no store, no React.
 */

import { ABOUT_FALLBACK_INTRO, EMPTY_ABOUT_PROFILE, type AboutProfile } from "@/data/about-profile";

export type StoredAboutProfile = Partial<AboutProfile>;

export const ABOUT_KEYS = Object.keys(EMPTY_ABOUT_PROFILE) as (keyof AboutProfile)[];

export function mergeAboutProfile(stored: StoredAboutProfile | null | undefined): AboutProfile {
  const merged: AboutProfile = { ...EMPTY_ABOUT_PROFILE };
  if (!stored || typeof stored !== "object") return merged;
  for (const key of ABOUT_KEYS) {
    const value = stored[key];
    if (typeof value === "string" && value.trim()) merged[key] = value.trim();
  }
  return merged;
}

/** Only non-empty fields — Redis holds decisions, not blanks. */
export function onlyFilledAbout(profile: AboutProfile): StoredAboutProfile {
  const out: StoredAboutProfile = {};
  for (const key of ABOUT_KEYS) {
    if (profile[key]?.trim()) Object.assign(out, { [key]: profile[key].trim() });
  }
  return out;
}

/**
 * Why this profile cannot be saved, or null.
 *
 * A photograph without alt text is refused — the image would be decorative
 * noise to a screen reader. Everything else may be empty; the public page
 * simply omits blank fields.
 */
/** Only our own media route — never an arbitrary external URL. */
export function isSafeAboutPhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return /^\/api\/media\?id=[A-Za-z0-9_-]+$/.test(trimmed);
}

export function aboutProfileProblem(profile: AboutProfile): string | null {
  if (profile.photoUrl.trim() && !isSafeAboutPhotoUrl(profile.photoUrl)) {
    return "The photograph must be uploaded through this site — paste is not accepted.";
  }
  if (profile.photoUrl.trim() && !profile.photoAlt.trim()) {
    return "A photograph needs a short description (alt text) so visitors who cannot see it still know who is in the picture.";
  }
  if (profile.photoAlt.trim() && !profile.photoUrl.trim()) {
    return "Alt text without a photograph — upload a picture, or clear the description.";
  }
  return null;
}

/** True when any personal field is ready to show (photo alone counts). */
export function aboutProfileHasPublicContent(profile: AboutProfile): boolean {
  return Boolean(
    profile.name ||
      profile.location ||
      profile.experience ||
      profile.languages ||
      profile.whyCreated ||
      (profile.photoUrl && profile.photoAlt && isSafeAboutPhotoUrl(profile.photoUrl)),
  );
}

export { ABOUT_FALLBACK_INTRO };
