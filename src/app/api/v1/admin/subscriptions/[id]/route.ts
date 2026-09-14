import { NextRequest, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/authorization";
import { isSubscriptionStatus } from "@/lib/subscriptions/core";
import { updateStudentSubscription } from "@/lib/subscriptions/service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authorization = await authorizeRequest(request, ["ADMIN"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Admin access required.",
    );
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return errorResponse(400, "INVALID_SUBSCRIPTION_ID", "Invalid subscription id.");
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  if (body.status !== undefined && !isSubscriptionStatus(body.status)) {
    return errorResponse(400, "INVALID_STATUS", "Unsupported subscription status.");
  }

  const startsAt = parseOptionalDate(body.startsAt);
  const endsAt = parseOptionalDate(body.endsAt);
  if ((body.startsAt !== undefined && startsAt === undefined) || (body.endsAt !== undefined && endsAt === undefined)) {
    return errorResponse(400, "INVALID_DATE", "Invalid subscription dates.");
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return errorResponse(400, "INVALID_DATE_RANGE", "Subscription end date must not precede start date.");
  }

  let notes: string | null | undefined;
  if (body.notes !== undefined) {
    if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000)) {
      return errorResponse(400, "INVALID_NOTES", "Notes must be null or a string up to 2000 characters.");
    }
    notes = body.notes as string | null;
  }

  if (body.status === undefined && body.startsAt === undefined && body.endsAt === undefined && body.notes === undefined) {
    return errorResponse(400, "NO_CHANGES", "At least one subscription field must be supplied.");
  }

  try {
    const subscription = await updateStudentSubscription(id, {
      status: isSubscriptionStatus(body.status) ? body.status : undefined,
      startsAt,
      endsAt,
      notes,
    });

    if (!subscription) {
      return errorResponse(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
    }

    return NextResponse.json(
      { data: { subscription }, meta: {} },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return errorResponse(409, "CURRENT_SUBSCRIPTION_EXISTS", "Another current subscription already exists for this student and offer.");
    }
    console.error("admin.subscription.update.failed", { code });
    return errorResponse(500, "SUBSCRIPTION_UNAVAILABLE", "Subscription service is temporarily unavailable.");
  }
}
