import assert from "node:assert/strict";
import { test } from "node:test";
import { tripAppEntryPath } from "@/lib/trip-app-entry";

test("opens a typed code, public trip link, or personal traveler link in the app", () => {
  assert.equal(tripAppEntryPath(" 12345678 "), "/i/12345678/app");
  assert.equal(tripAppEntryPath("https://www.whitegloveitineraries.com/i/Trip-Code_1"), "/i/Trip-Code_1/app");
  assert.equal(tripAppEntryPath("https://app.whitegloveitineraries.com/t/Traveler_1/app"), "/t/Traveler_1/app");
});

test("opens emailed account setup links from the app without dropping the invitation token", () => {
  const token = "a".repeat(43);
  assert.equal(tripAppEntryPath(`https://www.whitegloveitineraries.com/join#invite=${token}`), `/join#invite=${token}`);
  assert.equal(tripAppEntryPath("https://www.whitegloveitineraries.com/join#invite=invalid"), null);
  assert.equal(tripAppEntryPath("https://www.whitegloveitineraries.com/t/Traveler_1/app?screen=alerts"), "/t/Traveler_1/app?screen=alerts");
});

test("rejects non-trip paths and links away from the site", () => {
  for (const url of [
    "https://example.com/i/Trip-Code/app",
    "https://whitegloveitineraries.com.example.com/i/Trip-Code",
    "https://whitegloveitineraries.com@other.example/i/Trip-Code",
    "https://www.whitegloveitineraries.com/admin",
    "Trip Code",
  ]) {
    assert.equal(tripAppEntryPath(url), null);
  }
});
