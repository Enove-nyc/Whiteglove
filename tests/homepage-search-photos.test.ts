import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { HOME_SEARCH_PHOTOS } from "@/data/homepage-search-photos";
import { discoveryPhotos } from "@/data/discovery-photos.generated";
describe("real responsive homepage search photographs", () => {
  it("uses distinct credited destinations with bounded local responsive variants", () => {
    assert.equal(HOME_SEARCH_PHOTOS.length, 4);
    assert.equal(new Set(HOME_SEARCH_PHOTOS.map(p => p.creditId)).size, 4);
    for (const photo of HOME_SEARCH_PHOTOS) {
      assert.ok(discoveryPhotos.credits[photo.creditId]?.licenseUrl);
      assert.ok(photo.label);
      assert.equal(photo.width, 1600);
      assert.equal(photo.height, 900);
      for (const src of [photo.src, photo.smallSrc]) {
        assert.match(src, /^\/photos\/discovery\/[a-f0-9]{64}\.webp$/);
        const bytes = readFileSync("public" + src);
        assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
        assert.equal(createHash("sha256").update(bytes).digest("hex"), src.split("/").at(-1)?.replace(".webp", ""));
        assert.ok(bytes.length < 400_000, "Background asset should stay bounded");
      }
    }
  });
});
