import { gzipSync, gunzipSync } from "node:zlib";
import type { SearchDocument } from "@/lib/site-search-types";

/** Keep the full server-only index below Next's 2 MB cache-item limit. */
export function encodeSearchIndex(index: readonly SearchDocument[]): string {
  return gzipSync(JSON.stringify(index)).toString("base64");
}
export function decodeSearchIndex(encoded: string): SearchDocument[] {
  return JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8")) as SearchDocument[];
}
