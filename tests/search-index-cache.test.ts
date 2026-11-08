import assert from "node:assert/strict";
import { it } from "node:test";
import { buildSearchIndex } from "@/lib/site-search-index";
import { encodeSearchIndex, decodeSearchIndex } from "@/lib/search-index-cache";
it("preserves the full searchable corpus in a cacheable compressed entry", async () => {
  const index = await buildSearchIndex();
  const encoded = encodeSearchIndex(index);
  assert.ok(index.length > 1000);
  assert.ok(Buffer.byteLength(JSON.stringify(encoded)) < 1_900_000, "Leave room under Next's 2 MB cache limit");
  assert.deepEqual(decodeSearchIndex(encoded), JSON.parse(JSON.stringify(index)));
});
