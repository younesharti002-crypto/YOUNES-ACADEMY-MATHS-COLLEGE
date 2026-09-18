import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academySubmissionFiles,
  academySubmissions,
} from "@/db/academy-operations-schema";
import { studentProfiles } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { getAccessibleAssignment } from "@/lib/homework/access";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 3;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function uuid(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function safeComment(value: FormDataEntryValue | null): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim();
  return cleaned.length <= 2000 ? cleaned || null : undefined;
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Student access required.",
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "INVALID_FORM", "Invalid multipart form data.");
  }

  const assignmentId = uuid(formData.get("assignmentId"));
  const studentComment = safeComment(formData.get("comment"));
  const fileEntries = formData.getAll("files");
  const files = fileEntries.filter((value): value is File => value instanceof File);

  if (!assignmentId || studentComment === undefined) {
    return errorResponse(
      400,
      "INVALID_SUBMISSION",
      "Assignment and optional comment are invalid.",
    );
  }

  if (
    files.length === 0 ||
    files.length > MAX_FILES ||
    files.length !== fileEntries.length
  ) {
    return errorResponse(
      400,
      "INVALID_FILES",
      "Upload between 1 and 3 JPG, PNG or PDF files.",
    );
  }

  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.size;
    if (
      file.size <= 0 ||
      file.size > MAX_FILE_BYTES ||
      !ALLOWED_MIME.has(file.type)
    ) {
      return errorResponse(
        400,
        "INVALID_FILE",
        "Each file must be JPG, PNG or PDF and no larger than 5 MB.",
      );
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    return errorResponse(
      400,
      "FILES_TOO_LARGE",
      "The total upload must not exceed 10 MB.",
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
      "Assignment not found or not available to this student.",
    );
  }

  const [profile] = await db
    .select({
      id: studentProfiles.id,
      groupId: studentProfiles.primaryGroupId,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, authorization.session.user.id))
    .limit(1);

  if (!profile || profile.groupId !== assignment.groupId) {
    return errorResponse(
      403,
      "STUDENT_GROUP_MISMATCH",
      "This assignment does not belong to the student's group.",
    );
  }

  const [existing] = await db
    .select({
      id: academySubmissions.id,
      status: academySubmissions.status,
    })
    .from(academySubmissions)
    .where(
      and(
        eq(academySubmissions.assignmentId, assignmentId),
        eq(academySubmissions.studentProfileId, profile.id),
      ),
    )
    .limit(1);

  if (existing?.status === "CORRECTED") {
    return errorResponse(
      409,
      "SUBMISSION_ALREADY_CORRECTED",
      "A corrected submission cannot be replaced.",
    );
  }

  const preparedFiles = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name.slice(0, 255) || "submission",
      mimeType: file.type,
      sizeBytes: file.size,
      content: Buffer.from(await file.arrayBuffer()),
    })),
  );

  const now = new Date();
  const submission = await db.transaction(async (tx) => {
    let submissionId = existing?.id ?? null;

    if (submissionId) {
      const [updated] = await tx
        .update(academySubmissions)
        .set({
          status: "SUBMITTED",
          studentComment,
          submittedAt: now,
          updatedAt: now,
        })
        .where(eq(academySubmissions.id, submissionId))
        .returning({ id: academySubmissions.id });
      submissionId = updated.id;

      await tx
        .delete(academySubmissionFiles)
        .where(eq(academySubmissionFiles.submissionId, submissionId));
    } else {
      const [created] = await tx
        .insert(academySubmissions)
        .values({
          assignmentId,
          studentProfileId: profile.id,
          status: "SUBMITTED",
          studentComment,
          submittedAt: now,
          updatedAt: now,
        })
        .returning({ id: academySubmissions.id });
      submissionId = created.id;
    }

    if (!submissionId) {
      throw new Error("Submission id was not created.");
    }

    const finalSubmissionId = submissionId;
    await tx.insert(academySubmissionFiles).values(
      preparedFiles.map((file) => ({
        submissionId: finalSubmissionId,
        ...file,
      })),
    );

    return { id: finalSubmissionId };
  });

  return NextResponse.json(
    {
      data: {
        submissionId: submission.id,
        status: "SUBMITTED",
        files: preparedFiles.map(({ fileName, mimeType, sizeBytes }) => ({
          fileName,
          mimeType,
          sizeBytes,
        })),
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
