import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, studentSubscriptions } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import type { AuthenticatedSession } from "@/lib/auth/session";
import { isSubscriptionEntitled } from "@/lib/subscriptions/core";

export type SubscriberAuthorizationResult =
  | { ok: true; session: AuthenticatedSession }
  | {
      ok: false;
      reason: "UNAUTHENTICATED" | "FORBIDDEN" | "SUBSCRIPTION_REQUIRED";
    };

export async function hasActiveSubscriptionEntitlement(
  studentId: string,
  offerId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({
      subscriptionStatus: studentSubscriptions.status,
      subscriptionStartsAt: studentSubscriptions.startsAt,
      subscriptionEndsAt: studentSubscriptions.endsAt,
      offerActive: offers.active,
      offerStartsAt: offers.startsAt,
      offerEndsAt: offers.endsAt,
    })
    .from(studentSubscriptions)
    .innerJoin(offers, eq(studentSubscriptions.offerId, offers.id))
    .where(
      and(
        eq(studentSubscriptions.studentId, studentId),
        eq(studentSubscriptions.offerId, offerId),
        eq(studentSubscriptions.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!row) return false;

  return isSubscriptionEntitled(
    {
      status: row.subscriptionStatus,
      startsAt: row.subscriptionStartsAt,
      endsAt: row.subscriptionEndsAt,
    },
    {
      active: row.offerActive,
      startsAt: row.offerStartsAt,
      endsAt: row.offerEndsAt,
    },
    now,
  );
}

export async function authorizeSubscriberRequest(
  request: NextRequest,
  offerId: string,
): Promise<SubscriberAuthorizationResult> {
  const authorization = await authorizeRequest(request, ["STUDENT"]);

  if (!authorization.ok) {
    return authorization;
  }

  const entitled = await hasActiveSubscriptionEntitlement(
    authorization.session.user.id,
    offerId,
  );

  if (!entitled) {
    return { ok: false, reason: "SUBSCRIPTION_REQUIRED" };
  }

  return { ok: true, session: authorization.session };
}
