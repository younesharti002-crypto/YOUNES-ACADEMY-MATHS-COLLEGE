export const SUBSCRIPTION_STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type DateWindow = {
  startsAt: Date | null;
  endsAt: Date | null;
};

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === "string" && (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function isDateWithinWindow(window: DateWindow, now: Date): boolean {
  if (window.startsAt && window.startsAt > now) return false;
  if (window.endsAt && window.endsAt < now) return false;
  return true;
}

export function isSubscriptionEntitled(
  subscription: DateWindow & { status: SubscriptionStatus },
  offer: DateWindow & { active: boolean },
  now: Date = new Date(),
): boolean {
  return subscription.status === "ACTIVE" && offer.active && isDateWithinWindow(subscription, now) && isDateWithinWindow(offer, now);
}

export function buildSubscriptionStatusPatch(status: SubscriptionStatus, now: Date = new Date()) {
  if (status === "ACTIVE") {
    return { status, activatedAt: now, suspendedAt: null, expiredAt: null, updatedAt: now };
  }
  if (status === "SUSPENDED") {
    return { status, suspendedAt: now, updatedAt: now };
  }
  if (status === "EXPIRED") {
    return { status, expiredAt: now, updatedAt: now };
  }
  return { status, activatedAt: null, suspendedAt: null, expiredAt: null, updatedAt: now };
}
