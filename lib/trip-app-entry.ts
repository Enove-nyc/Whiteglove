import { BRAND_HOSTS } from "./site-brand-core";

const CODE = /^[A-Za-z0-9_-]{1,128}$/;
const LINK_PATH = /^\/(i|t)\/([A-Za-z0-9_-]{1,128})(?:\/(?:app|print))?\/?$/;

export function tripAppEntryPath(input: string): string | null {
  const value = input.trim();
  if (CODE.test(value)) return `/i/${value}/app`;
  try {
    const url = new URL(value);
    const validHost = BRAND_HOSTS.itineraries.includes(url.hostname) || url.hostname === "app.whitegloveitineraries.com";
    if (url.protocol !== "https:" || !validHost || url.port || url.username || url.password) return null;
    if (/^\/join\/?$/.test(url.pathname)) {
      const token = new URLSearchParams(url.hash.slice(1)).get("invite");
      return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? `/join#invite=${token}` : null;
    }
    const match = LINK_PATH.exec(url.pathname);
    if (!match) return null;
    const screen = url.searchParams.get("screen");
    return `/${match[1]}/${match[2]}/app${match[1] === "t" && (screen === "messages" || screen === "alerts") ? `?screen=${screen}` : ""}`;
  } catch {
    return null;
  }
}
