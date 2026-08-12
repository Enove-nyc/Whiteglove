import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { editablePages, getPageDef } from "@/data/pages";
import { blockSummary, emptyBlock, parseBlocks, visibleBlocks, type BlockKind, type PageBlock } from "@/data/page-blocks";
import { builtInDirectory, countriesIn, filterDirectory } from "@/lib/directory-index";

// A page that renders nothing is worse than a page nobody can edit, so the
// fail-safe path is what these cover: bad stored blocks must never reach a
// visitor, and every registered page must have something to show.

describe("every editable page ships with content", () => {
  it("has pages registered", () => {
    // A floor against the registry emptying out, not a count of pages. Pages
    // get merged — Planning folded into Services — and that should not read as
    // a failure. What matters is that the list is populated and every entry in
    // it renders, which the tests below check one by one.
    assert.ok(editablePages.length >= 8, `expected the registry to be filled, found ${editablePages.length}`);
  });

  for (const def of editablePages) {
    it(`${def.slug} has blocks, an address and search text`, () => {
      assert.ok(def.blocks.length > 0, `${def.slug} would render an empty page`);
      assert.match(def.href, /^\//, `${def.slug} needs an address starting with /`);
      assert.ok(def.seoTitle.trim(), `${def.slug} has no search title`);
      assert.ok(def.seoDescription.trim(), `${def.slug} has no search description`);
    });

    it(`${def.slug} starts with a heading a visitor can see`, () => {
      const hero = def.blocks.find((b) => b.kind === "hero");
      assert.ok(hero && hero.kind === "hero" && hero.heading.trim(), `${def.slug} has no heading`);
    });

    it(`${def.slug} has a unique id on every block`, () => {
      const ids = def.blocks.map((b) => b.id);
      assert.equal(new Set(ids).size, ids.length, `${def.slug} repeats a block id`);
    });
  }

  it("every slug is unique", () => {
    const slugs = editablePages.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it("registers the remaining content pages", () => {
    for (const slug of ["travel-guide", "map", "lizensk"]) {
      assert.ok(getPageDef(slug), `${slug} is not in the registry`);
    }
  });

  it("finds a page by slug and refuses an unknown one", () => {
    assert.ok(getPageDef(editablePages[0].slug));
    assert.equal(getPageDef("not-a-page"), undefined);
  });
});

describe("owner-edited public pages are not frozen at build", () => {
  it("reads per request so a published edit appears", () => {
    for (const def of editablePages) {
      const file = `app${def.href === "/" ? "" : def.href}/page.tsx`;
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        if (def.slug === "getaways") continue;
        throw new Error(`${def.slug} has no page at ${file}`);
      }
      assert.match(source, /force-dynamic/, `${def.slug} would freeze a published edit at build`);
    }
  });
});

describe("stored blocks are never trusted", () => {
  it("refuses anything that is not a list", () => {
    for (const bad of [null, undefined, {}, "blocks", 42, true]) {
      assert.equal(parseBlocks(bad), null, `accepted ${JSON.stringify(bad)}`);
    }
  });

  it("drops entries it does not recognise rather than rendering them", () => {
    assert.equal(parseBlocks([{ kind: "script", src: "evil.js" }]), null);
    assert.equal(parseBlocks([null, 3, "x"]), null);
  });

  it("keeps the good blocks out of a mixed list", () => {
    const parsed = parseBlocks([
      { kind: "hero", heading: "Hello", eyebrow: "", intro: "" },
      { kind: "nonsense" },
    ]);
    assert.equal(parsed?.length, 1);
    assert.equal(parsed?.[0].kind, "hero");
  });

  it("gives a block an id when one is missing", () => {
    const parsed = parseBlocks([{ kind: "text", body: "words" }]);
    assert.ok(parsed?.[0].id, "a block with no id would break React's list keys");
  });

  it("coerces a wrong-typed field instead of throwing", () => {
    const parsed = parseBlocks([{ kind: "text", body: 42, heading: null }]);
    assert.equal(parsed?.length, 1);
    assert.equal((parsed![0] as Extract<PageBlock, { kind: "text" }>).body, "");
  });

  it("survives a cards block whose items are rubbish", () => {
    const parsed = parseBlocks([{ kind: "cards", items: "not a list" }]);
    assert.equal(parsed?.length, 1);
    assert.deepEqual((parsed![0] as Extract<PageBlock, { kind: "cards" }>).items, []);
  });

  it("round-trips every block kind", () => {
    const kinds: BlockKind[] = ["hero", "text", "cards", "list", "image", "buttons", "quote", "note"];
    const made = kinds.map(emptyBlock);
    const parsed = parseBlocks(JSON.parse(JSON.stringify(made)));
    assert.equal(parsed?.length, kinds.length);
    assert.deepEqual(parsed?.map((b) => b.kind), kinds);
  });

  it("hides a hidden block from visitors but keeps it in the record", () => {
    const blocks = [emptyBlock("hero"), { ...emptyBlock("text"), hidden: true }];
    assert.equal(visibleBlocks(blocks).length, 1);
    assert.equal(blocks.length, 2, "hiding must not delete");
  });

  it("summarises every kind without throwing", () => {
    for (const kind of ["hero", "text", "cards", "list", "image", "buttons", "quote", "note"] as BlockKind[]) {
      assert.equal(typeof blockSummary(emptyBlock(kind)), "string");
    }
  });
});

describe("the directory index", () => {
  const entries = builtInDirectory();

  it("holds the batei hachaim and the towns", () => {
    assert.ok(entries.filter((e) => e.kind === "kever").length >= 140);
    assert.ok(entries.filter((e) => e.kind === "town").length >= 100);
  });

  it("gives every entry somewhere to be edited", () => {
    for (const e of entries) assert.match(e.editHref, /^\/admin\//, `${e.id} has no edit link`);
  });

  it("searches by tzaddik as well as by town", () => {
    const found = filterDirectory(entries, { query: "noam elimelech", kind: "all", country: "all", onlyMissing: false });
    assert.ok(found.length > 0, "searching for a tzaddik should find his beis hachaim");
  });

  it("narrows by kind and by country", () => {
    const poland = filterDirectory(entries, { query: "", kind: "kever", country: "Poland", onlyMissing: false });
    assert.ok(poland.length > 0);
    assert.ok(poland.every((e) => e.kind === "kever" && e.country === "Poland"));
  });

  it("can show only what is missing something", () => {
    const gaps = filterDirectory(entries, { query: "", kind: "all", country: "all", onlyMissing: true });
    assert.ok(gaps.every((e) => e.missing.length > 0));
    assert.ok(gaps.length > 0, "most batei hachaim have no exact grave location, so this should find some");
  });

  it("lists countries with the commonest first", () => {
    const countries = countriesIn(entries);
    assert.ok(countries.length > 3);
    assert.ok(countries.includes("Poland"));
  });

  it("returns nothing rather than everything for a query that matches nothing", () => {
    const none = filterDirectory(entries, { query: "zzzzznotathing", kind: "all", country: "all", onlyMissing: false });
    assert.equal(none.length, 0);
  });
});
