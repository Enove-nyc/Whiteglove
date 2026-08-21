import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  emptyFormTemplate,
  fieldIsSensitive,
  fieldLabel,
  missingRequiredFields,
  type ClientFormTemplate,
} from "@/data/client-form";

describe("a form field's label", () => {
  it("a standard field reads its fixed label", () => {
    assert.equal(fieldLabel({ id: "1", kind: "standard", key: "passportNumber", required: true }), "Passport number");
  });

  it("a custom field reads whatever the planner typed", () => {
    assert.equal(fieldLabel({ id: "1", kind: "custom", label: "Preferred airline", required: false }), "Preferred airline");
  });
});

describe("which fields are marked private", () => {
  it("a passport or date of birth is sensitive", () => {
    assert.equal(fieldIsSensitive({ id: "1", kind: "standard", key: "passportNumber", required: false }), true);
    assert.equal(fieldIsSensitive({ id: "1", kind: "standard", key: "dateOfBirth", required: false }), true);
  });

  it("a phone number or seating preference is not", () => {
    assert.equal(fieldIsSensitive({ id: "1", kind: "standard", key: "phone", required: false }), false);
    assert.equal(fieldIsSensitive({ id: "1", kind: "standard", key: "seatingPreference", required: false }), false);
  });

  it("a custom question is never marked sensitive — only the fixed list is", () => {
    assert.equal(fieldIsSensitive({ id: "1", kind: "custom", label: "Anything", required: false }), false);
  });
});

describe("checking a response against its template", () => {
  const template: ClientFormTemplate = {
    fields: [
      { id: "name", kind: "standard", key: "legalName", required: true },
      { id: "diet", kind: "standard", key: "dietaryRequirements", required: false },
    ],
    updatedAt: "t",
  };

  it("a fresh template needs nothing", () => {
    assert.deepEqual(emptyFormTemplate().fields, []);
  });

  it("names every required field left blank, by its label", () => {
    assert.deepEqual(missingRequiredFields(template, {}), ["Legal name (as on passport)"]);
  });

  it("an optional field never shows up as missing", () => {
    assert.deepEqual(missingRequiredFields(template, { name: "Dovid Cohen" }), []);
  });

  it("whitespace alone doesn't count as answered", () => {
    assert.deepEqual(missingRequiredFields(template, { name: "   " }), ["Legal name (as on passport)"]);
  });
});

describe("an answer never reaches anywhere it shouldn't", () => {
  const PLANNER_ROUTE = readFileSync("app/api/account/client-form/route.ts", "utf8");
  const PUBLIC_ROUTE = readFileSync("app/api/client-form/[shareId]/route.ts", "utf8");
  const STORE = readFileSync("lib/account-store.ts", "utf8");

  it("the planner side is Business-gated and checks same-origin before writing", () => {
    assert.match(PLANNER_ROUTE, /mayServeCompanionClients/);
    const post = PLANNER_ROUTE.slice(PLANNER_ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
  });

  it("a fresh respondent's GET never carries anyone else's answers", () => {
    const fn = STORE.slice(STORE.indexOf("export async function getSharedForm"), STORE.indexOf("export async function submitFormResponse"));
    assert.doesNotMatch(fn, /formResponses/, "getSharedForm must never read formResponses back to a client");
    assert.match(fn, /template: trip\.formTemplate/);
  });

  it("the public submit route is rate limited and checks same-origin before it writes anything", () => {
    const post = PUBLIC_ROUTE.slice(PUBLIC_ROUTE.indexOf("export async function POST"));
    assert.match(post, /sameOrigin/);
    assert.match(post, /rateLimit\(`client-form-submit:/);
    assert.ok(post.indexOf("sameOrigin") < post.indexOf("rateLimit"));
  });

  it("a submission only ever keeps answers the template actually asked for", () => {
    const fn = STORE.slice(STORE.indexOf("export async function submitFormResponse"), STORE.indexOf("export async function getFormResponses"));
    assert.match(fn, /for \(const field of trip\.formTemplate\.fields\)/);
  });

  it("reading answers back is a separate, planner-only call — never bundled into the public route", () => {
    assert.doesNotMatch(PUBLIC_ROUTE, /getFormResponses/);
    assert.match(PLANNER_ROUTE, /getFormResponses/);
  });
});
