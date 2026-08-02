import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BetaNotice,
  DEFAULT_NOTICE,
  isOwnersOwnScreen,
  noticeFrom,
  noticeProblem,
  readDismissed,
  shouldShow,
} from "@/lib/beta-notice";

/**
 * "This is new. Please check anything you are going to rely on."
 *
 * The thing these tests are really protecting: people plan real journeys on
 * this site, to places where the difference between a shomer's old number and
 * his current one is standing outside a locked gate. A caution that does not
 * say what to be cautious about is decoration, and the site would be no more
 * honest for having shown it.
 */

const notice = (over: Partial<BetaNotice> = {}): BetaNotice => ({ ...DEFAULT_NOTICE, ...over });

describe("what it says when nobody has set anything", () => {
  it("is shippable as it stands", () => {
    // If the owner never opens the settings, this is what the first visitor
    // reads. It has to be the right thing, not a placeholder.
    assert.equal(noticeProblem(DEFAULT_NOTICE), null);
    assert.equal(DEFAULT_NOTICE.on, true);
  });

  it("names what to check rather than saying to be careful", () => {
    assert.match(DEFAULT_NOTICE.caution, /number|address|time/i);
  });

  it("asks for feedback and gives somewhere to send it", () => {
    assert.ok(DEFAULT_NOTICE.feedback.trim().length > 20);
    assert.match(DEFAULT_NOTICE.feedbackHref, /^\//);
  });
});

describe("whether to show it", () => {
  it("shows it to somebody who has not seen this wording", () => {
    assert.equal(shouldShow(notice(), { dismissedVersion: null, path: "/" }), true);
  });

  it("does not show it twice", () => {
    assert.equal(shouldShow(notice({ version: "1" }), { dismissedVersion: "1", path: "/" }), false);
  });

  it("shows it again when the wording changes", () => {
    // Somebody who dismissed the old words has not agreed to the new ones.
    assert.equal(shouldShow(notice({ version: "2" }), { dismissedVersion: "1", path: "/" }), true);
  });

  it("does not show it when it is switched off", () => {
    assert.equal(shouldShow(notice({ on: false }), { dismissedVersion: null, path: "/" }), false);
  });

  it("does not show it with nothing to say", () => {
    assert.equal(shouldShow(notice({ heading: "  " }), { dismissedVersion: null, path: "/" }), false);
    assert.equal(shouldShow(notice({ body: "" }), { dismissedVersion: null, path: "/" }), false);
  });

  it("does not put it over the owner's own screens", () => {
    // The admin is his workshop; telling him the site is unfinished is telling
    // him what he is in the middle of doing. And a modal over a password box
    // is an obstacle rather than a courtesy.
    for (const path of ["/admin", "/admin/destinations", "/login", "/access"]) {
      assert.equal(shouldShow(notice(), { dismissedVersion: null, path }), false, path);
    }
  });

  it("still shows it on the pages visitors are actually on", () => {
    for (const path of ["/", "/stops", "/cemeteries/lizhensk", "/itinerary", "/account"]) {
      assert.equal(shouldShow(notice(), { dismissedVersion: null, path }), true, path);
    }
  });

  it("does not mistake a page that merely starts with those letters", () => {
    assert.equal(isOwnersOwnScreen("/administration-of-estates"), false);
    assert.equal(isOwnersOwnScreen("/accessories"), false);
    assert.equal(isOwnersOwnScreen("/admin"), true);
    assert.equal(isOwnersOwnScreen("/admin/photos"), true);
  });
});

describe("reading what was stored", () => {
  it("takes a version back", () => {
    assert.equal(readDismissed("2"), "2");
  });

  it("treats rubbish as not dismissed", () => {
    // The worst a corrupted value can do is show the notice once more.
    for (const bad of [null, undefined, "", "   "]) assert.equal(readDismissed(bad), null, String(bad));
  });
});

describe("filling in what the owner left blank", () => {
  it("falls back field by field", () => {
    // Clearing one line must not leave a gap under a heading — a blank
    // paragraph reads as something that failed to load, and this is the one
    // screen where that would undermine the whole point of it.
    const filled = noticeFrom({ heading: "We are still building", body: "   " });
    assert.equal(filled.heading, "We are still building");
    assert.equal(filled.body, DEFAULT_NOTICE.body);
    assert.equal(filled.caution, DEFAULT_NOTICE.caution);
  });

  it("keeps off meaning off", () => {
    // The one field where a blank is a real answer rather than a gap.
    assert.equal(noticeFrom({ on: false }).on, false);
    assert.equal(noticeFrom({}).on, DEFAULT_NOTICE.on);
    assert.equal(noticeFrom(null).on, DEFAULT_NOTICE.on);
  });
});

describe("what the owner cannot save", () => {
  it("refuses a caution that does not say what to check", () => {
    const said = noticeProblem(notice({ caution: "Use with caution." }));
    assert.match(String(said), /warns nobody/);
  });

  it("refuses a body with nothing in it", () => {
    assert.match(String(noticeProblem(notice({ body: "Beta." }))), /what is still being worked on/i);
  });

  it("refuses a heading with nothing in it", () => {
    assert.equal(noticeProblem(notice({ heading: " " })), "Give it a heading.");
  });

  it("refuses a feedback link that goes nowhere", () => {
    assert.match(String(noticeProblem(notice({ feedbackHref: "contact" }))), /start with/);
    assert.equal(noticeProblem(notice({ feedbackHref: "https://example.com/x" })), null);
  });

  it("checks nothing once it is switched off", () => {
    // Turning it off is how this ends. It must not be blocked by the wording
    // it is about to stop showing.
    assert.equal(noticeProblem(notice({ on: false, heading: "", body: "", caution: "" })), null);
  });
});
