/**
 * Regenerate lib/init-sql.ts from prisma/schema.prisma.
 *
 *   npm run build:sql
 *
 * The admin's "set up the database" button executes that SQL, because a
 * migration cannot be run against the database from every environment. It is
 * generated rather than written, and it had drifted a long way: produced when
 * the directory tables were added and never again, so it was missing the six
 * PlaceCategory values, the whole Photo table, the verification and consent
 * columns, and everything after them. A database provisioned with the button
 * would have come up missing all of it, and the first symptom would have been
 * a picture failing to save with no clue why.
 *
 * Run this whenever schema.prisma changes. tests/generated-sql.test.ts fails
 * if you forget.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const HEADER = `// Auto-generated from prisma/schema.prisma. Do NOT hand-edit.
//
// The /api/admin/db-setup route executes this to create the tables, because a
// migration cannot be run against the database from every environment.
//
// WHAT IT CAN AND CANNOT DO. It is a from-empty script, so on a fresh database
// it builds everything. On a database that already has tables, lib/db-setup.ts
// runs it statement by statement and swallows "already exists" — which adds a
// whole NEW table, but cannot add a column to a table that is already there,
// and cannot add a value to an enum. Those need \`npm run db:migrate\`, and the
// admin screen says so rather than implying the button is enough.
//
// Regenerate:
//   npm run build:sql
export const INIT_SQL = String.raw\`
`;

const out = execFileSync(
  "npx",
  ["prisma", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);

const start = out.indexOf("-- CreateSchema");
if (start < 0) throw new Error("prisma migrate diff produced no schema script:\n" + out.slice(0, 500));
const sql = out.slice(start).trimEnd() + "\n";

// A backtick or ${ would end the template literal early and produce a file
// that compiles to something else entirely. Neither has ever appeared in
// generated DDL; if one ever does, this stops rather than corrupting the file.
if (sql.includes("`") || sql.includes("${")) {
  throw new Error("the generated SQL contains a backtick or a template placeholder — it cannot go in a raw literal");
}

writeFileSync("lib/init-sql.ts", HEADER + sql + "`;\n");
console.log(`lib/init-sql.ts — ${sql.split("\n").length} lines`);
