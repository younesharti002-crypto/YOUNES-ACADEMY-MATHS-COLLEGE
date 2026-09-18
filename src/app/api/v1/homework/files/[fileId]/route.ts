import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  academySubmissionFiles,
  academySubmissions,
} from "@/db/academy-operations-schema";
import {
  parentProfiles,
  parentStudents,
  studentProfiles,
} from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { getAccessibleAssignment } from "@/lib/homework/access";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const authorization = await authorizeRequest(request, [
    "ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
  ]);

  if (!authorization.ok) {
    return jsonError(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "File access denied.",
    );
  }

  const { fileId } = await params;
  if (!UUID_PATTERN.test(fileId)) {
    return jsonError(400, "INVALID_FILE_ID", "Invalid file id.");
  }

  const [file] = await db
    .select({
      id: academySubmissionFiles.id,
      fileName: academySubmissionFiles.fileName,
      mimeType: academySubmissionFiles.mimeType,
      sizeBytes: academySubmissionFiles.sizeBytes,
      content: academySubmissionFiles.content,
      submissionId: academySubmissions.id,
      studentProfileId: academySubmissions.studentProfileId,
      assignmentId: academySubmissions.assignmentId,
    })
    .from(academySubmissionFiles)
    .innerJoin(
      academySubmissions,
      eq(academySubmissionFiles.submissionId, academySubmissions.id),
    )
    .where(eq(academySubmissionFiles.id, fileId))
    .limit(1);

  if (!file) {
    return jsonError(404, "FILE_NOT_FOUND", "File not found.");
  }

  const session = authorization.session;
  let allowed = session.user.role === "ADMIN";

  if (!allowed && session.user.role === "TEACHER") {
    allowed = Boolean(
      await getAccessibleAssignment(session, file.assignmentId),
    );
  }

  if (!allowed && session.user.role === "STUDENT") {
    const [profile] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1);
    allowed = profile?.id === file.studentProfileId;
  }

  if (!allowed && session.user.role === "PARENT") {
    const [linked] = await db
      .select({ parentId: parentStudents.parentId })
      .from(parentStudents)
      .innerJoin(
        parentProfiles,
        eq(parentStudents.parentId, parentProfiles.id),
      )
      .where(
        and(
          eq(parentProfiles.userId, session.user.id),
          eq(parentStudents.studentId, file.studentProfileId),
        ),
      )
      .limit(1);
    allowed = Boolean(linked);
  }

  if (!allowed) {
    return jsonError(403, "FILE_FORBIDDEN", "File access denied.");
  }

  const encodedName = encodeURIComponent(file.fileName);
  const bytes = new Uint8Array(file.content);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.sizeBytes),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
