import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

// Every admin route must refuse a caller who is not signed in as an
// administrator. This is a static guard rather than a live request: it catches
// the failure that actually happens, which is a new route being added without
// the check, and it catches it without needing a server or a database.

const ADMIN_API = path.join(process.cwd(), "app/api/admin");

// Signing out only clears a cookie. Requiring a valid session to do it would
// mean an expired session could never be cleared.
const NO_AUTH_NEEDED = new Set(["app/api/admin/logout/route.ts"]);

// Any of the guard helpers used across the admin routes.
const GUARD = /isAdmin\(|isValidAccessToken\(|requireAdmin\(|\badmin\(request\)/;
const ADMIN_ACTIONS = ["app/admin/add/actions.ts", "app/admin/kevarim/actions.ts", "app/admin/shomrim/actions.ts", "app/admin/destinations/actions.ts", "app/admin/pages/actions.ts", "app/admin/directory/actions.ts"];

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

/** The handlers a route file exports — these are the ways in. */
function exportedMethods(source: string): string[] {
  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
}

describe("admin authorisation", () => {
  const files = routeFiles(ADMIN_API);

  it("finds the admin API routes", () => {
    assert.ok(files.length >= 10, `expected the admin API routes, found ${files.length}`);
  });

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const source = readFileSync(file, "utf8");

    if (NO_AUTH_NEEDED.has(rel)) continue;

    it(`${rel} checks the admin cookie`, () => {
      assert.match(
        source,
        /isValidAccessToken\(\s*["']admin["']/,
        `${rel} does not verify the admin cookie — every admin route must`,
      );
    });

    it(`${rel} refuses before doing anything`, () => {
      for (const method of exportedMethods(source)) {
        const body = source.slice(source.indexOf(`export async function ${method}`));
        // The guard has to be the first thing the handler does, before it
        // reads a body, touches the database or calls anything out.
        const head = body.slice(0, 400);
        assert.ok(GUARD.test(head), `${rel} ${method} does work before checking authorisation`);
      }
    });
  }

  for (const rel of ADMIN_ACTIONS) {
    const full = path.join(process.cwd(), rel);
    let source: string;
    try {
      source = readFileSync(full, "utf8");
    } catch {
      continue; // an action file that does not exist is not a failure
    }
    it(`${rel} checks the admin cookie in every action`, () => {
      const actions = [...source.matchAll(/export\s+async\s+function\s+(\w+Action)\b/g)].map((m) => m[1]);
      assert.ok(actions.length > 0, `${rel} exports no actions`);
      for (const action of actions) {
        const start = source.indexOf(`export async function ${action}`);
        const head = source.slice(start, start + 500);
        assert.match(head, /requireAdmin|isValidAccessToken/, `${rel} ${action} does not check authorisation`);
      }
    });
  }
});

describe("secrets never reach the browser", () => {
  const files = routeFiles(ADMIN_API);

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const source = readFileSync(file, "utf8");

    // A diagnostic that passes another server's error text through has to
    // redact it — that text can quote our own request back at us.
    const returnsForeignError = /await\s+res\.text\(\)|reason\?\.error\?\.message|error\.message/.test(source);
    if (!returnsForeignError) continue;

    it(`${rel} redacts what it passes back`, () => {
      assert.match(source, /redact/, `${rel} returns error text without redacting it`);
    });
  }

  it("no admin route puts a key in a URL", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const rel = path.relative(process.cwd(), file);
      assert.ok(
        !/[?&](?:key|api_?key|access_token)=\$\{/.test(source),
        `${rel} interpolates a credential into a URL — use a header instead`,
      );
    }
  });
});
