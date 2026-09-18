import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyHomework,
  academyHomeworkFiles,
  academyHomeworkSubmissions,
} from "@/db/academy-operations-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import { studentProfiles } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeRequest(request, ["ADMIN", "TEACHER", "STUDENT"]);
  if (!authorization.ok) {
    return NextResponse.json({ error: { code: authorization.reason } }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db
    .select({
      fileName: academyHomeworkFiles.fileName,
      mimeType: academyHomeworkFiles.mimeType,
      dataBase64: academyHomeworkFiles.dataBase64,
      studentUserId: studentProfiles.userId,
      groupId: academyHomework.groupId,
    })
    .from(academyHomeworkFiles)
    .innerJoin(
      academyHomeworkSubmissions,
      eq(academyHomeworkFiles.submissionId, academyHomeworkSubmissions.id),
    )
    .innerJoin(
      studentProfiles,
      eq(academyHomeworkSubmissions.studentProfileId, studentProfiles.id),
    )
    .innerJoin(academyHomework, eq(academyHomeworkSubmissions.homeworkId, academyHomework.id))
    .where(eq(academyHomeworkFiles.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: { code: "FILE_NOT_FOUND" } }, { status: 404 });
  }

  const user = authorization.session.user;
  if (user.role === "STUDENT" && row.studentUserId !== user.id) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  if (user.role === "TEACHER") {
    const [assigned] = await db
      .select({ id: academyWeeklySessions.id })
      .from(academyWeeklySessions)
      .where(
        and(
          eq(academyWeeklySessions.groupId, row.groupId),
          eq(academyWeeklySessions.teacherUserId, user.id),
        ),
      )
      .limit(1);
    if (!assigned) {
      return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }
  }

  const bytes = Buffer.from(row.dataBase64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `inline; filename="${row.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
