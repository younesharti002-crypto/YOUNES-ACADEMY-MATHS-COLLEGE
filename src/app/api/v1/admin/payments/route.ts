import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyBillingItems,
  academyPaymentTransactions,
} from "@/db/academy-finance-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import {
  groups,
  levels,
  studentProfiles,
  subjects,
  users,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const METHODS = ["CASH", "TRANSFER", "OTHER"] as const;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function expectedPriceCentimes(levelName: string): number {
  return ["4AP", "5AP", "6AP"].includes(levelName) ? 10_000 : 20_000;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      "Admin access required.",
    );
  }

  const students = await db
    .select({
      profileId: studentProfiles.id,
      fullName: users.fullName,
      studentCode: studentProfiles.studentCode,
      levelName: levels.name,
      groupId: studentProfiles.primaryGroupId,
      groupName: groups.name,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .innerJoin(levels, eq(studentProfiles.levelId, levels.id))
    .leftJoin(groups, eq(studentProfiles.primaryGroupId, groups.id))
    .where(eq(users.status, "ACTIVE"))
    .orderBy(asc(users.fullName));

  const groupIds = [
    ...new Set(students.map((row) => row.groupId).filter((value): value is string => Boolean(value))),
  ];

  const scopes =
    groupIds.length === 0
      ? []
      : await db
          .selectDistinct({
            groupId: academyWeeklySessions.groupId,
            subjectId: academyWeeklySessions.subjectId,
            subjectName: subjects.name,
          })
          .from(academyWeeklySessions)
          .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id))
          .where(inArray(academyWeeklySessions.groupId, groupIds))
          .orderBy(asc(subjects.name));

  const billing = await db
    .select({
      id: academyBillingItems.id,
      studentProfileId: academyBillingItems.studentProfileId,
      subjectId: academyBillingItems.subjectId,
      billingMonth: academyBillingItems.billingMonth,
      expectedAmountCentimes: academyBillingItems.expectedAmountCentimes,
      paidAmountCentimes: academyBillingItems.paidAmountCentimes,
      status: academyBillingItems.status,
      studentName: users.fullName,
      studentCode: studentProfiles.studentCode,
      subjectName: subjects.name,
      levelName: levels.name,
    })
    .from(academyBillingItems)
    .innerJoin(studentProfiles, eq(academyBillingItems.studentProfileId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .innerJoin(levels, eq(studentProfiles.levelId, levels.id))
    .innerJoin(subjects, eq(academyBillingItems.subjectId, subjects.id))
    .orderBy(desc(academyBillingItems.billingMonth), asc(users.fullName));

  const billingIds = billing.map((row) => row.id);
  const transactions =
    billingIds.length === 0
      ? []
      : await db
          .select({
            id: academyPaymentTransactions.id,
            billingItemId: academyPaymentTransactions.billingItemId,
            amountCentimes: academyPaymentTransactions.amountCentimes,
            teacherShareCentimes: academyPaymentTransactions.teacherShareCentimes,
            schoolShareCentimes: academyPaymentTransactions.schoolShareCentimes,
            academyShareCentimes: academyPaymentTransactions.academyShareCentimes,
            method: academyPaymentTransactions.method,
            reference: academyPaymentTransactions.reference,
            notes: academyPaymentTransactions.notes,
            receivedAt: academyPaymentTransactions.receivedAt,
          })
          .from(academyPaymentTransactions)
          .where(inArray(academyPaymentTransactions.billingItemId, billingIds))
          .orderBy(desc(academyPaymentTransactions.receivedAt));

  return NextResponse.json(
    { data: { students, scopes, billing, transactions } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      "Admin access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const studentProfileId = uuid(body.studentProfileId);
  const subjectId = uuid(body.subjectId);
  const billingMonth =
    typeof body.billingMonth === "string" && MONTH_PATTERN.test(body.billingMonth)
      ? `${body.billingMonth}-01`
      : null;
  const amountDh =
    typeof body.amountDh === "number" && Number.isFinite(body.amountDh)
      ? body.amountDh
      : null;
  const method =
    typeof body.method === "string" && (METHODS as readonly string[]).includes(body.method)
      ? (body.method as (typeof METHODS)[number])
      : "CASH";
  const reference =
    typeof body.reference === "string" && body.reference.trim().length <= 200
      ? body.reference.trim() || null
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim().length <= 1000
      ? body.notes.trim() || null
      : null;

  if (!studentProfileId || !subjectId || !billingMonth || amountDh === null || amountDh <= 0) {
    return errorResponse(
      400,
      "INVALID_PAYMENT",
      "Student, subject, billing month and positive amount are required.",
    );
  }

  const amountCentimes = Math.round(amountDh * 100);
  if (amountCentimes <= 0) {
    return errorResponse(400, "INVALID_AMOUNT", "Payment amount must be positive.");
  }

  const [student] = await db
    .select({
      profileId: studentProfiles.id,
      levelName: levels.name,
      groupId: studentProfiles.primaryGroupId,
    })
    .from(studentProfiles)
    .innerJoin(levels, eq(studentProfiles.levelId, levels.id))
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  if (!student?.groupId) {
    return errorResponse(404, "STUDENT_GROUP_NOT_FOUND", "Student group not found.");
  }

  const [scope] = await db
    .select({ id: academyWeeklySessions.id })
    .from(academyWeeklySessions)
    .where(
      and(
        eq(academyWeeklySessions.groupId, student.groupId),
        eq(academyWeeklySessions.subjectId, subjectId),
      ),
    )
    .limit(1);

  if (!scope) {
    return errorResponse(
      409,
      "SUBJECT_NOT_IN_GROUP",
      "This subject is not part of the student's current group.",
    );
  }

  const expectedAmountCentimes = expectedPriceCentimes(student.levelName);
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    let [billing] = await tx
      .select()
      .from(academyBillingItems)
      .where(
        and(
          eq(academyBillingItems.studentProfileId, studentProfileId),
          eq(academyBillingItems.subjectId, subjectId),
          eq(academyBillingItems.billingMonth, billingMonth),
        ),
      )
      .limit(1);

    if (!billing) {
      [billing] = await tx
        .insert(academyBillingItems)
        .values({
          studentProfileId,
          subjectId,
          billingMonth,
          expectedAmountCentimes,
          paidAmountCentimes: 0,
          status: "UNPAID",
        })
        .returning();
    }

    const newPaid = billing.paidAmountCentimes + amountCentimes;
    if (newPaid > billing.expectedAmountCentimes) {
      throw new Error("OVERPAYMENT");
    }

    const teacherShareCentimes = Math.floor((amountCentimes * 50) / 100);
    const schoolShareCentimes = Math.floor((amountCentimes * 30) / 100);
    const academyShareCentimes =
      amountCentimes - teacherShareCentimes - schoolShareCentimes;

    const [transaction] = await tx
      .insert(academyPaymentTransactions)
      .values({
        billingItemId: billing.id,
        amountCentimes,
        teacherShareCentimes,
        schoolShareCentimes,
        academyShareCentimes,
        method,
        reference,
        notes,
        receivedAt: now,
        recordedByUserId: authorization.session.user.id,
      })
      .returning();

    const status =
      newPaid === billing.expectedAmountCentimes ? "PAID" : "PARTIAL";

    const [updatedBilling] = await tx
      .update(academyBillingItems)
      .set({
        paidAmountCentimes: newPaid,
        status,
        updatedAt: now,
      })
      .where(eq(academyBillingItems.id, billing.id))
      .returning();

    return { billing: updatedBilling, transaction };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "OVERPAYMENT") {
      return null;
    }
    throw error;
  });

  if (!result) {
    return errorResponse(
      409,
      "OVERPAYMENT",
      "This payment would exceed the expected monthly amount.",
    );
  }

  return NextResponse.json(
    { data: result },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
