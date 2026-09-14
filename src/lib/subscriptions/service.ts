import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  offers,
  studentSubscriptions,
  users,
  type StudentSubscription,
} from "@/db/schema";
import {
  buildSubscriptionStatusPatch,
  type SubscriptionStatus,
} from "@/lib/subscriptions/core";

export type CreateStudentSubscriptionInput = {
  studentId: string;
  offerId: string;
  createdByUserId: string | null;
  status?: SubscriptionStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
  notes?: string | null;
};

export type UpdateStudentSubscriptionInput = {
  status?: SubscriptionStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
  notes?: string | null;
};

export async function getStudentSubscriptionById(
  id: string,
): Promise<StudentSubscription | null> {
  const [subscription] = await db
    .select()
    .from(studentSubscriptions)
    .where(eq(studentSubscriptions.id, id))
    .limit(1);

  return subscription ?? null;
}

async function assertStudentAndOfferExist(
  studentId: string,
  offerId: string,
): Promise<void> {
  const [student] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  if (!student || student.role !== "STUDENT") {
    throw new Error("STUDENT_REQUIRED");
  }

  const [offer] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(eq(offers.id, offerId))
    .limit(1);

  if (!offer) {
    throw new Error("OFFER_NOT_FOUND");
  }
}

export async function createStudentSubscription(
  input: CreateStudentSubscriptionInput,
): Promise<StudentSubscription> {
  await assertStudentAndOfferExist(input.studentId, input.offerId);

  const now = new Date();
  const status = input.status ?? "PENDING";
  const statusPatch = buildSubscriptionStatusPatch(status, now);

  const [subscription] = await db
    .insert(studentSubscriptions)
    .values({
      studentId: input.studentId,
      offerId: input.offerId,
      createdByUserId: input.createdByUserId,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      notes: input.notes ?? null,
      ...statusPatch,
    })
    .returning();

  if (!subscription) {
    throw new Error("SUBSCRIPTION_CREATION_FAILED");
  }

  return subscription;
}

export async function updateStudentSubscription(
  id: string,
  input: UpdateStudentSubscriptionInput,
): Promise<StudentSubscription | null> {
  const now = new Date();
  const patch: Record<string, unknown> = { updatedAt: now };

  if (input.status) {
    Object.assign(patch, buildSubscriptionStatusPatch(input.status, now));
  }
  if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt;
  if (input.notes !== undefined) patch.notes = input.notes;

  const [subscription] = await db
    .update(studentSubscriptions)
    .set(patch)
    .where(eq(studentSubscriptions.id, id))
    .returning();

  return subscription ?? null;
}

export async function findCurrentStudentSubscription(
  studentId: string,
  offerId: string,
): Promise<StudentSubscription | null> {
  const [subscription] = await db
    .select()
    .from(studentSubscriptions)
    .where(
      and(
        eq(studentSubscriptions.studentId, studentId),
        eq(studentSubscriptions.offerId, offerId),
      ),
    )
    .orderBy(studentSubscriptions.createdAt)
    .limit(1);

  return subscription ?? null;
}
