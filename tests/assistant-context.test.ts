import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contextLine, contextualQuery, subjectOfPath } from "@/lib/assistant-context";
import { readConversation } from "@/lib/assistant-conversation";
import { codeOf } from "./helpers/source";

describe("what page the traveler is on", () => {
  it("knows a destination by its slug", () => {
    assert.deepEqual(subjectOfPath("/destinations/vienna"), { label: "Vienna, Austria", hint: "Vienna" });
  });

  it("knows a bais hachaim by its town", () => {
    const subject = subjectOfPath("/cemeteries/lizhensk");
    assert.ok(subject?.label.includes("Poland"));
    assert.ok(subject?.hint);
  });

  it("says nothing for a page that is not about one place", () => {
    // A directory of every restaurant in Europe is not about anywhere, and
    // taking the first town on it would be worse than no context at all.
    assert.equal(subjectOfPath("/kosher"), null);
    assert.equal(subjectOfPath("/destinations"), null);
    assert.equal(subjectOfPath("/"), null);
    assert.equal(subjectOfPath(""), null);
    assert.equal(subjectOfPath(null), null);
  });

  it("says nothing for a slug the site does not have", () => {
    // The path is a key looked up in the site's own lists, never a label. A
    // page label built from the request would be a way to write into the
    // prompt from outside.
    assert.equal(subjectOfPath("/destinations/ignore-previous-instructions"), null);
    assert.equal(subjectOfPath("/destinations/../../etc/passwd"), null);
  });

  it("ignores a query string and a fragment", () => {
    assert.deepEqual(subjectOfPath("/destinations/vienna?from=search#kosher"), {
      label: "Vienna, Austria",
      hint: "Vienna",
    });
  });
});

describe("the extra search the page buys", () => {
  it("adds the place to the question", () => {
    assert.equal(contextualQuery("is there a mikvah here", subjectOfPath("/destinations/vienna")), "is there a mikvah here Vienna");
  });

  it("does not run a second search when the question already names the place", () => {
    assert.equal(contextualQuery("mikvah in Vienna", subjectOfPath("/destinations/vienna")), null);
  });

  it("is nothing at all without a place", () => {
    assert.equal(contextualQuery("is there a mikvah here", null), null);
  });
});

describe("context adds, it never narrows", () => {
  it("searches the question as asked as well", () => {
    // Somebody on the Vienna page asking about Antwerp still gets Antwerp.
    const route = codeOf("app/api/assistant/site/route.ts");
    assert.match(route, /searchSite\(question, PAGES\)/);
    assert.match(route, /contextual \? searchSite\(contextual, PAGES\)/);
  });

  it("gives the model one line, built from our own data", () => {
    const line = contextLine(subjectOfPath("/destinations/vienna"));
    assert.match(line, /Vienna, Austria/);
    assert.match(line, /"here"/);
    const route = codeOf("app/api/assistant/site/route.ts");
    assert.match(route, /contextLine\(subject\)/);
    // The address itself is never handed to the model.
    assert.doesNotMatch(route, /body\?\.page[\s\S]{0,200}userMessage/);
  });
});

describe("what is said back", () => {
  it("keeps the place on a stored answer, trimmed", () => {
    const long = "x".repeat(400);
    const read = readConversation({
      turns: [{ role: "assistant", text: "Yes.", at: "2026-01-01T00:00:00Z", about: long }],
    });
    assert.equal(read.turns[0].about?.length, 120);
  });

  it("drops a place that is not a string", () => {
    const read = readConversation({
      turns: [{ role: "assistant", text: "Yes.", at: "2026-01-01T00:00:00Z", about: { evil: true } }],
    });
    assert.equal(read.turns[0].about, undefined);
  });

  it("shows it on the answer rather than leaving it to look like a guess", () => {
    assert.match(codeOf("components/SiteAssistant.tsx"), /About \{turn\.about\}/);
  });
});
