import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSubscriptionStatusPatch,
  isSubscriptionEntitled,
  isSubscriptionStatus,
} from "../../src/lib/subscriptions/core.ts";

const now = new Date("2026-08-21T12:00:00.000Z");
const openWindow = { startsAt: null, endsAt: null };
const activeOffer = { ...openWindow, active: true };

for (const status of ["PENDING", "EXPIRED", "SUSPENDED"] as const) {
  test(`${status} subscription is denied`, () => {
    assert.equal(
      isSubscriptionEntitled({ ...openWindow, status }, activeOffer, now),
      false,
    );
  });
}

test("ACTIVE subscription with active offer is entitled", () => {
  assert.equal(
    isSubscriptionEntitled(
      { ...openWindow, status: "ACTIVE" },
      activeOffer,
      now,
    ),
    true,
  );
});

test("ACTIVE subscription outside its date window is denied", () => {
  assert.equal(
    isSubscriptionEntitled(
      {
        status: "ACTIVE",
        startsAt: new Date("2026-08-22T00:00:00.000Z"),
        endsAt: null,
      },
      activeOffer,
      now,
    ),
    false,
  );

  assert.equal(
    isSubscriptionEntitled(
      {
        status: "ACTIVE",
        startsAt: null,
        endsAt: new Date("2026-08-20T23:59:59.000Z"),
      },
      activeOffer,
      now,
    ),
    false,
  );
});

test("inactive or out-of-window offer denies entitlement", () => {
  const subscription = { ...openWindow, status: "ACTIVE" as const };
  assert.equal(
    isSubscriptionEntitled(subscription, { ...openWindow, active: false }, now),
    false,
  );
  assert.equal(
    isSubscriptionEntitled(
      subscription,
      {
        active: true,
        startsAt: new Date("2026-08-22T00:00:00.000Z"),
        endsAt: null,
      },
      now,
    ),
    false,
  );
});

test("status parser accepts only supported statuses", () => {
  assert.equal(isSubscriptionStatus("ACTIVE"), true);
  assert.equal(isSubscriptionStatus("PENDING"), true);
  assert.equal(isSubscriptionStatus("EXPIRED"), true);
  assert.equal(isSubscriptionStatus("SUSPENDED"), true);
  assert.equal(isSubscriptionStatus("CANCELLED"), false);
});

test("status patches set lifecycle timestamps safely", () => {
  assert.deepEqual(buildSubscriptionStatusPatch("ACTIVE", now), {
    status: "ACTIVE",
    activatedAt: now,
    suspendedAt: null,
    expiredAt: null,
    updatedAt: now,
  });
  assert.deepEqual(buildSubscriptionStatusPatch("SUSPENDED", now), {
    status: "SUSPENDED",
    suspendedAt: now,
    updatedAt: now,
  });
  assert.deepEqual(buildSubscriptionStatusPatch("EXPIRED", now), {
    status: "EXPIRED",
    expiredAt: now,
    updatedAt: now,
  });
});
