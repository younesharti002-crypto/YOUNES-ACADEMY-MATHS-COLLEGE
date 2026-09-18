import { asc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyCorrections,
  academySubmissionFiles,
  academySubmissions,
} from "@/db/academy-operations-schema";
import { studentProfiles, users } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { getAccessibleAssignment } from "@/lib/homework/access";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function optionalScore(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function optionalComment(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length <= 4000 ? cleaned || null : undefined;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN", "TEACHER"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Staff access required.",
    );
  }

  const assignmentId = uuid(new URL(request.url).searchParams.get("assignmentId"));
  if (!assignmentId) {
    return errorResponse(
      400,
      "INVALID_ASSIGNMENT_ID",
      "A valid assignmentId is required.",
    );
  }

  const assignment = await getAccessibleAssignment(
    authorization.session,
    assignmentId,
  );
  if (!assignment) {
    return errorResponse(
      404,
      "ASSIGNMENT_NOT_FOUND",
      "Assignment not found or inaccessible.",
    );
  }

  const submissions = await db
    .select({
      id: academySubmissions.id,
      studentProfileId: academySubmissions.studentProfileId,
      studentName: users.fullName,
      studentCode: studentProfiles.studentCode,
      status: academySubmissions.status,
      studentComment: academySubmissions.studentComment,
      submittedAt: academySubmissions.submittedAt,
      score: academyCorrections.score,
      scoreMax: academyCorrections.scoreMax,
      correctionComment: academyCorrections.comment,
      correctedAt: academyCorrections.correctedAt,
    })
    .from(academySubmissions)
    .innerJoin(
      studentProfiles,
      eq(academySubmissions.studentProfileId, studentProfiles.id),
    )
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .leftJoin(
      academyCorrections,
      eq(academyCorrections.submissionId, academySubmissions.id),
    )
    .where(eq(academySubmissions.assignmentId, assignmentId))
    .orderBy(asc(users.fullName));

  const submissionIds = submissions.map((row) => row.id);
  const files =
    submissionIds.length === 0
      ? []
      : await db
          .select({
            id: academySubmissionFiles.id,
            submissionId: academySubmissionFiles.submissionId,
            fileName: academySubmissionFiles.fileName,
            mimeType: academySubmissionFiles.mimeType,
            sizeBytes: academySubmissionFiles.sizeBytes,
          })
          .from(academySubmissionFiles)
          .where(inArray(academySubmissionFiles.submissionId, submissionIds));

  const filesBySubmission = new Map<
    string,
    Array<{
      id: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>
  >();

  for (const file of files) {
    const current = filesBySubmission.get(file.submissionId) ?? [];
    current.push({
      id: file.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });
    filesBySubmission.set(file.submissionId, current);
  }

  return NextResponse.json(
    {
      data: {
        submissions: submissions.map((row) => ({
          ...row,
          files: filesBySubmission.get(row.id) ?? [],
        })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN", "TEACHER"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Staff access required.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Invalid request body.");
  }

  const submissionId = uuid(body.submissionId);
  const score = optionalScore(body.score);
  const scoreMax = optionalScore(body.scoreMax);
  const comment = optionalComment(body.comment);

  if (
    !submissionId ||
    score === undefined ||
    scoreMax === undefined ||
    comment === undefined ||
    (score !== null && scoreMax !== null && (scoreMax <= 0 || score > scoreMax))
  ) {
    return errorResponse(
      400,
      "INVALID_CORRECTION",
      "Submission, valid score values and optional comment are required.",
    );
  }

  const [submission] = await db
    .select({
      id: academySubmissions.id,
      assignmentId: academySubmissions.assignmentId,
    })
    .from(academySubmissions)
    .where(eq(academySubmissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return errorResponse(404, "SUBMISSION_NOT_FOUND", "Submission not found.");
  }

  const assignment = await getAccessibleAssignment(
    authorization.session,
    submission.assignmentId,
  );
  if (!assignment) {
    return errorResponse(
      403,
      "ASSIGNMENT_FORBIDDEN",
      "This submission is outside the staff member's assignment scope.",
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(academyCorrections)
      .values({
        submissionId,
        teacherUserId: authorization.session.user.id,
        score: score === null ? null : String(score),
        scoreMax: scoreMax === null ? null : String(scoreMax),
        comment,
        correctedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: academyCorrections.submissionId,
        set: {
          teacherUserId: authorization.session.user.id,
          score: score === null ? null : String(score),
          scoreMax: scoreMax === null ? null : String(scoreMax),
          comment,
          correctedAt: now,
          updatedAt: now,
        },
      });

    await tx
      .update(academySubmissions)
      .set({ status: "CORRECTED", updatedAt: now })
      .where(eq(academySubmissions.id, submissionId));
  });

  return NextResponse.json(
    { data: { corrected: true } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
