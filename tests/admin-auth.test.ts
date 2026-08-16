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
//
// And the route that MINTS an admin session cannot require one — that is what
// it is for. It is not unguarded: it proves authorisation the other way, from
// the account session plus the team screen's own grant, which is checked
// below rather than taken on trust.
const NO_AUTH_NEEDED = new Set([
  "app/api/admin/logout/route.ts",
  "app/api/admin/session/route.ts",
]);

// Any of the guard helpers used across the admin routes. currentAdmin() is a
// guard too — it verifies the same signed cookie through lib/admin-current and
// the handlers that call it 401 on a null identity. It was missing from this
// list, so two genuinely guarded routes read as unguarded here for months and
// the suite sat red — which is the worst state for a tripwire: a REAL
// unguarded route would have arrived as one more line of familiar noise.
const GUARD = /isAdmin\(|isValidAccessToken\(|requireAdmin\(|\badmin\(request\)|currentAdmin\(/;
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

describe("the route that mints an admin session", () => {
  // Exempt from the cookie rule above, so what it does instead is spelled out
  // here. Get this wrong and anybody signed into any account is an
  // administrator.
  const source = readFileSync(path.join(ADMIN_API, "session/route.ts"), "utf8");

  it("requires a signed-in account", () => {
    assert.match(source, /readSessionEmail\(/);
    assert.match(source, /Sign in to your account first/);
  });

  it("asks the team screen whether that account is an administrator", () => {
    assert.match(source, /isAdminAccount\(/);
    assert.match(source, /not an administrator/);
  });

  it("checks the origin, like every other mutating route", () => {
    assert.match(source, /sameOrigin\(/);
  });

  it("does all of that before it mints anything", () => {
    const mint = source.indexOf("accessToken(");
    assert.ok(mint > 0);
    assert.ok(source.indexOf("isAdminAccount(") < mint, "it mints the session before checking who is asking");
    assert.ok(source.indexOf("sameOrigin(") < mint, "it mints the session before checking the origin");
  });
});

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
      // Two ways to check the same cookie: isValidAccessToken("admin", …)
      // inline, or currentAdmin() — which calls exactly that against the same
      // jar (lib/admin-current.ts) and additionally resolves who it is.
      const checksIt = /isValidAccessToken\(\s*["']admin["']/.test(source) || /currentAdmin\(/.test(source);
      assert.ok(checksIt, `${rel} does not verify the admin cookie — every admin route must`);
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

describe("every mutating admin route refuses a cross-site request", () => {
  const files = routeFiles(ADMIN_API);

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const source = readFileSync(file, "utf8");
    const mutating = exportedMethods(source).filter((m) => m !== "GET");
    if (!mutating.length) continue;

    it(`${rel} checks the origin`, () => {
      // Next checks Origin against Host for server actions, but a plain API
      // route gets no such check, and the admin cookie is SameSite=Lax — which
      // a browser will still send on a top-level cross-site POST.
      assert.match(source, /sameOrigin\(/, `${rel} accepts a POST from any website`);
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
