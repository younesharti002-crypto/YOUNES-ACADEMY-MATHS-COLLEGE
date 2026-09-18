import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyHomework,
  academyHomeworkCorrections,
  academyHomeworkSubmissions,
} from "@/db/academy-operations-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN", "TEACHER"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      "Staff access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const submissionId =
    typeof body.submissionId === "string" && UUID_PATTERN.test(body.submissionId)
      ? body.submissionId
      : null;
  const score =
    typeof body.score === "number" && Number.isInteger(body.score)
      ? body.score
      : null;
  const scoreMax =
    typeof body.scoreMax === "number" && Number.isInteger(body.scoreMax)
      ? body.scoreMax
      : null;
  const comment =
    typeof body.comment === "string" && body.comment.trim().length <= 3000
      ? body.comment.trim() || null
      : null;

  if (
    !submissionId ||
    (score !== null && score < 0) ||
    (scoreMax !== null && scoreMax <= 0) ||
    (score !== null && scoreMax !== null && score > scoreMax)
  ) {
    return errorResponse(400, "INVALID_CORRECTION", "Invalid correction data.");
  }

  const [submission] = await db
    .select({
      id: academyHomeworkSubmissions.id,
      groupId: academyHomework.groupId,
    })
    .from(academyHomeworkSubmissions)
    .innerJoin(academyHomework, eq(academyHomeworkSubmissions.homeworkId, academyHomework.id))
    .where(eq(academyHomeworkSubmissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return errorResponse(404, "SUBMISSION_NOT_FOUND", "Submission not found.");
  }

  if (authorization.session.user.role === "TEACHER") {
    const [assigned] = await db
      .select({ id: academyWeeklySessions.id })
      .from(academyWeeklySessions)
      .where(
        and(
          eq(academyWeeklySessions.groupId, submission.groupId),
          eq(academyWeeklySessions.teacherUserId, authorization.session.user.id),
        ),
      )
      .limit(1);
    if (!assigned) {
      return errorResponse(403, "GROUP_NOT_ASSIGNED", "This group is not assigned to this teacher.");
    }
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(academyHomeworkCorrections)
      .values({
        submissionId,
        score,
        scoreMax,
        comment,
        correctedByUserId: authorization.session.user.id,
        correctedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: academyHomeworkCorrections.submissionId,
        set: {
          score,
          scoreMax,
          comment,
          correctedByUserId: authorization.session.user.id,
          correctedAt: now,
          updatedAt: now,
        },
      });

    await tx
      .update(academyHomeworkSubmissions)
      .set({ status: "CORRECTED", updatedAt: now })
      .where(eq(academyHomeworkSubmissions.id, submissionId));
  });

  return NextResponse.json(
    { data: { corrected: true } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
