import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyHomework,
  academyHomeworkFiles,
  academyHomeworkSubmissions,
} from "@/db/academy-operations-schema";
import { studentProfiles } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      "Student access required.",
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) return errorResponse(400, "INVALID_FORM", "Invalid upload form.");

  const homeworkIdRaw = form.get("homeworkId");
  const file = form.get("file");

  if (
    typeof homeworkIdRaw !== "string" ||
    !UUID_PATTERN.test(homeworkIdRaw) ||
    !(file instanceof File)
  ) {
    return errorResponse(400, "INVALID_UPLOAD", "Homework and file are required.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(415, "UNSUPPORTED_FILE", "Only JPG, PNG and PDF are accepted.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return errorResponse(413, "FILE_TOO_LARGE", "Maximum file size is 5 MB.");
  }

  const [profile] = await db
    .select({
      id: studentProfiles.id,
      primaryGroupId: studentProfiles.primaryGroupId,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, authorization.session.user.id))
    .limit(1);

  if (!profile?.primaryGroupId) {
    return errorResponse(409, "NO_GROUP", "Student is not assigned to a group.");
  }

  const [homework] = await db
    .select({ id: academyHomework.id, groupId: academyHomework.groupId })
    .from(academyHomework)
    .where(eq(academyHomework.id, homeworkIdRaw))
    .limit(1);

  if (!homework || homework.groupId !== profile.primaryGroupId) {
    return errorResponse(404, "HOMEWORK_NOT_FOUND", "Homework not found for this student.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataBase64 = bytes.toString("base64");
  const now = new Date();

  const submission = await db.transaction(async (tx) => {
    const [saved] = await tx
      .insert(academyHomeworkSubmissions)
      .values({
        homeworkId: homework.id,
        studentProfileId: profile.id,
        status: "SUBMITTED",
        submittedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          academyHomeworkSubmissions.homeworkId,
          academyHomeworkSubmissions.studentProfileId,
        ],
        set: {
          status: "SUBMITTED",
          submittedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    await tx.insert(academyHomeworkFiles).values({
      submissionId: saved.id,
      fileName: file.name.slice(0, 240) || "submission",
      mimeType: file.type,
      sizeBytes: file.size,
      dataBase64,
    });

    return saved;
  });

  return NextResponse.json(
    { data: { submissionId: submission.id, status: submission.status } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
