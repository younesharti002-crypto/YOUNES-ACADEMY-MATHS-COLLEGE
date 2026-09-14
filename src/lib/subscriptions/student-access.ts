import { eq } from "drizzle-orm";
import { db } from "@/db";
import { offers, studentSubscriptions } from "@/db/schema";
import { isSubscriptionEntitled } from "@/lib/subscriptions/core";

export type StudentAccessState = "ACTIVE" | "PENDING" | "SUSPENDED" | "EXPIRED" | "NONE";

export type StudentSubscriptionAccess = {
  state: StudentAccessState;
  entitledAcademicYearIds: string[];
};

export async function getStudentSubscriptionAccess(
  studentId: string,
  now: Date = new Date(),
): Promise<StudentSubscriptionAccess> {
  const rows = await db
    .select({
      academicYearId: offers.academicYearId,
      subscriptionStatus: studentSubscriptions.status,
      subscriptionStartsAt: studentSubscriptions.startsAt,
      subscriptionEndsAt: studentSubscriptions.endsAt,
      offerActive: offers.active,
      offerStartsAt: offers.startsAt,
      offerEndsAt: offers.endsAt,
    })
    .from(studentSubscriptions)
    .innerJoin(offers, eq(studentSubscriptions.offerId, offers.id))
    .where(eq(studentSubscriptions.studentId, studentId));

  const entitledAcademicYearIds = Array.from(
    new Set(
      rows
        .filter((row) =>
          Boolean(row.academicYearId) &&
          isSubscriptionEntitled(
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
          ),
        )
        .map((row) => row.academicYearId as string),
    ),
  );

  if (entitledAcademicYearIds.length > 0) {
    return { state: "ACTIVE", entitledAcademicYearIds };
  }

  if (rows.some((row) => row.subscriptionStatus === "PENDING")) {
    return { state: "PENDING", entitledAcademicYearIds: [] };
  }

  if (rows.some((row) => row.subscriptionStatus === "SUSPENDED")) {
    return { state: "SUSPENDED", entitledAcademicYearIds: [] };
  }

  if (rows.some((row) => row.subscriptionStatus === "EXPIRED" || row.subscriptionStatus === "ACTIVE")) {
    return { state: "EXPIRED", entitledAcademicYearIds: [] };
  }

  return { state: "NONE", entitledAcademicYearIds: [] };
}
