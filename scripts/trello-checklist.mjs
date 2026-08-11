// Put a checklist onto a Trello board, one card per item.
//
//   TRELLO_KEY=… TRELLO_TOKEN=… node scripts/trello-checklist.mjs cards.json
//   …and add --dry-run first, which prints what it would create and stops.
//
// WHY THIS IS SEPARATE FROM lib/trello.ts. That one raises a card when a
// VISITOR sends something in — a photograph, a correction, a request — and it
// is deliberately one-way and fire-and-forget, because a traveller does not
// care whether the owner uses Trello. This is the other direction: a list of
// work the owner already knows about, pushed once, by hand, from a terminal.
// Sharing code between the two would tie a background integration that must
// never break to a script that is allowed to fail loudly. It should fail
// loudly: if a card did not get made, you want to know now.
//
// CREDENTIALS COME FROM THE ENVIRONMENT AND ARE NEVER PRINTED. The key and
// token in /admin/settings/trello are the same pair; take them from there, or
// from trello.com/power-ups/admin. They are not read from the site's store,
// because a script run from a laptop has no business reaching into it.
//
// A LIST IS CREATED IF IT IS NOT THERE. Trello's API wants a list id, and
// nobody knows their list ids; you know your board. So this takes a board id
// and matches lists by name, making any that are missing.

import { readFileSync } from "node:fs";

const KEY = process.env.TRELLO_KEY?.trim();
const TOKEN = process.env.TRELLO_TOKEN?.trim();
const BOARD = process.env.TRELLO_BOARD?.trim();
const file = process.argv.find((a) => a.endsWith(".json")) ?? "docs/trello-cards.json";
const dryRun = process.argv.includes("--dry-run");

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!dryRun && (!KEY || !TOKEN || !BOARD)) {
  die(
    "Set TRELLO_KEY, TRELLO_TOKEN and TRELLO_BOARD first.\n" +
      "  key + token : trello.com/power-ups/admin (the same pair as /admin/settings/trello)\n" +
      "  board id    : open the board and add .json to the URL, or use its short link\n" +
      "Add --dry-run to see what would be created without any of them.",
  );
}

const cards = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(cards) || cards.length === 0) die(`${file} holds no cards.`);

const auth = `key=${encodeURIComponent(KEY ?? "")}&token=${encodeURIComponent(TOKEN ?? "")}`;

async function trello(path, { method = "GET", body } = {}) {
  const url = `https://api.trello.com/1/${path}${path.includes("?") ? "&" : "?"}${auth}`;
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    // The body carries Trello's own reason ("invalid token", "unauthorized
    // board"), which is the only useful part of a failure here.
    throw new Error(`${method} ${path} → ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  return response.json();
}

/** The lists on the board, by name, making any that are missing. */
async function resolveLists(names) {
  const existing = await trello(`boards/${BOARD}/lists`);
  const byName = new Map(existing.map((list) => [list.name.trim().toLowerCase(), list.id]));
  const out = new Map();
  for (const name of names) {
    const found = byName.get(name.trim().toLowerCase());
    if (found) {
      out.set(name, found);
      continue;
    }
    // pos: "bottom" so a new list lands after whatever the board already has,
    // rather than shoving itself in front of the owner's own columns.
    const made = await trello(`lists?name=${encodeURIComponent(name)}&idBoard=${BOARD}&pos=bottom`, { method: "POST" });
    process.stdout.write(`  created list "${name}"\n`);
    out.set(name, made.id);
  }
  return out;
}

const lists = [...new Set(cards.map((card) => card.list))];

if (dryRun) {
  process.stdout.write(`Would create ${cards.length} cards across ${lists.length} lists:\n\n`);
  for (const list of lists) {
    const mine = cards.filter((card) => card.list === list);
    process.stdout.write(`${list} (${mine.length})\n`);
    for (const card of mine) process.stdout.write(`  • ${card.name}\n`);
    process.stdout.write("\n");
  }
  process.exit(0);
}

const listIds = await resolveLists(lists);

// EXISTING CARD NAMES ARE READ FIRST, so running this twice does not give you
// forty cards. Matching on name is crude and it is the right crudeness here:
// the alternative is storing ids somewhere, and a script run once a quarter
// should not own state.
const open = await trello(`boards/${BOARD}/cards?fields=name,idList`);
const already = new Set(open.map((card) => `${card.idList}::${card.name.trim().toLowerCase()}`));

let made = 0;
let skipped = 0;
for (const card of cards) {
  const idList = listIds.get(card.list);
  if (already.has(`${idList}::${card.name.trim().toLowerCase()}`)) {
    skipped += 1;
    continue;
  }
  await trello("cards", { method: "POST", body: { idList, name: card.name, desc: card.desc, pos: "bottom" } });
  made += 1;
  process.stdout.write(`  + ${card.list}: ${card.name}\n`);
}

process.stdout.write(`\n${made} created, ${skipped} already there.\n`);
