import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/authorization";
import { isSubscriptionStatus } from "@/lib/subscriptions/core";
import { createStudentSubscription } from "@/lib/subscriptions/service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authorization = await authorizeRequest(request, ["ADMIN"]);

  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Admin access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  if (
    typeof body.studentId !== "string" ||
    !UUID_PATTERN.test(body.studentId) ||
    typeof body.offerId !== "string" ||
    !UUID_PATTERN.test(body.offerId)
  ) {
    return errorResponse(400, "INVALID_REQUEST", "Valid studentId and offerId are required.");
  }

  if (body.status !== undefined && !isSubscriptionStatus(body.status)) {
    return errorResponse(400, "INVALID_STATUS", "Unsupported subscription status.");
  }

  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if ((body.startsAt !== undefined && startsAt === undefined) || (body.endsAt !== undefined && endsAt === undefined)) {
    return errorResponse(400, "INVALID_DATE", "Invalid subscription dates.");
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return errorResponse(400, "INVALID_DATE_RANGE", "Subscription end date must not precede start date.");
  }

  const notes = body.notes === undefined || body.notes === null ? null : body.notes;
  if (typeof notes !== "string" || notes.length > 2000) {
    return errorResponse(400, "INVALID_NOTES", "Notes must be a string up to 2000 characters.");
  }

  try {
    const subscription = await createStudentSubscription({
      studentId: body.studentId,
      offerId: body.offerId,
      createdByUserId: authorization.session.user.id,
      status: isSubscriptionStatus(body.status) ? body.status : "PENDING",
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      notes,
    });

    return NextResponse.json(
      { data: { subscription }, meta: {} },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "STUDENT_REQUIRED") {
      return errorResponse(400, code, "The selected account must be a student.");
    }
    if (code === "OFFER_NOT_FOUND") {
      return errorResponse(404, code, "Offer not found.");
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return errorResponse(409, "CURRENT_SUBSCRIPTION_EXISTS", "A current subscription already exists for this student and offer.");
    }
    console.error("admin.subscription.create.failed", { code });
    return errorResponse(500, "SUBSCRIPTION_UNAVAILABLE", "Subscription service is temporarily unavailable.");
  }
}
