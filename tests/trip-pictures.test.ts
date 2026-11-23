import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyItinerary, redactForTraveler } from "@/data/itinerary";
import { sharedTripPictures, tripPictureUrls, withoutAttachments } from "@/lib/attachments";
import { groupKey, readMember, signMember } from "@/lib/trip-group-identity";

test("trip pictures respect explicit sharing and a traveler's itinerary scope", () => {
  const photo = (id: string, shared = false) => ({ id, kind: "photo", name: id, contentType: "image/jpeg", bytes: 100, addedAt: "", shared });
  const trip = {
    ...emptyItinerary(),
    coverPhoto: photo("cover"),
    lodging: [{ id: "s", type: "hotel" as const, name: "Hotel", checkIn: "", checkOut: "", attachments: [photo("private"), photo("hotel", true)] }],
    activities: [{ id: "a", name: "Private activity", date: "", unitKey: "other-unit", attachments: [photo("activity", true)] }],
  };
  const pictures = sharedTripPictures(redactForTraveler(trip, "unknown", { individual: true }));
  assert.deepEqual(pictures, { cover: "cover", photos: [{ id: "hotel", label: "Hotel" }] });
  assert.equal(withoutAttachments(trip).coverPhoto, undefined);
  assert.deepEqual(tripPictureUrls(pictures, "personal-code"), {
    cover: "/api/trip-file/personal-code?id=cover",
    photos: [{ src: "/api/trip-file/personal-code?id=hotel", label: "Hotel" }],
  });
});

test("personal codes share a conversation while membership remains bound to the credential", () => {
  const secret = "test secret";
  const group = groupKey("trip-wide-code");
  const personal = "personal-code";
  const member = { id: "59c4685d-620a-4f21-a81a-3e7ca0c4152f", name: "Test Traveler", group, credential: groupKey(personal) };
  const token = signMember(member, secret);
  assert.deepEqual(readMember(token, personal, secret, group), member);
  assert.equal(readMember(token, "another-personal-code", secret, group), null);
  assert.equal(readMember(token, personal, secret, groupKey("unrelated-trip")), null);
});
