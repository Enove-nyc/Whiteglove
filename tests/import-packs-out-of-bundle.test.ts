import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { IMPORT_PACK_SOURCES, importPacks } from "@/lib/import-packs";

/**
 * The four large review packs are read at run time from the database
 * (lib/import-packs.ts), so they stay out of the site's server code and it
 * stays under the hosting size limit. A static import of any of them from the
 * site would quietly put them back.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("the large review packs stay out of the site bundle", () => {
  const site = [...sourceFiles("app"), ...sourceFiles("lib"), ...sourceFiles("components"), "data/imports/index.ts", "middleware.ts"];

  for (const { file } of IMPORT_PACK_SOURCES) {
    const module = file.replace(/^data\//, "@/data/").replace(/\.ts$/, "");
    it(`nothing in the site imports ${module} for real`, () => {
      for (const path of site) {
        const text = readFileSync(path, "utf8");
        const real = text.split("\n").filter((line) => line.includes(`"${module}"`) && !/^\s*import type /.test(line));
        assert.deepEqual(real, [], `${path} imports ${module}`);
      }
    });
  }

  it("still reads every pack from the repo in tests and scripts", () => {
    const packs = importPacks();
    for (const { key } of IMPORT_PACK_SOURCES) assert.ok(packs[key].length > 100, key);
  });

  it("the host build writes them to the database before building", () => {
    assert.match(readFileSync("package.json", "utf8"), /"build:host": "npm run db:migrate && tsx scripts\/sync-import-packs.ts && next build"/);
    assert.match(readFileSync("netlify.toml", "utf8"), /command = "npm run build:host"/);
  });
});
