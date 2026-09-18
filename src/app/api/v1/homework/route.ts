import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyHomework,
  academyHomeworkCorrections,
  academyHomeworkFiles,
  academyHomeworkSubmissions,
} from "@/db/academy-operations-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import { groups, studentProfiles, subjects, users } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";

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

function shortText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

async function staffGroupIds(userId: string, role: string) {
  if (role === "ADMIN") return null;
  const rows = await db
    .select({ groupId: academyWeeklySessions.groupId })
    .from(academyWeeklySessions)
    .where(eq(academyWeeklySessions.teacherUserId, userId));
  return [...new Set(rows.map((row) => row.groupId))];
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["ADMIN", "TEACHER", "STUDENT"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      "Homework access denied.",
    );
  }

  const user = authorization.session.user;

  if (user.role === "STUDENT") {
    const [profile] = await db
      .select({
        id: studentProfiles.id,
        primaryGroupId: studentProfiles.primaryGroupId,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id))
      .limit(1);

    if (!profile?.primaryGroupId) {
      return NextResponse.json(
        { data: { assignments: [] } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const assignments = await db
      .select({
        id: academyHomework.id,
        title: academyHomework.title,
        instructions: academyHomework.instructions,
        dueAt: academyHomework.dueAt,
        createdAt: academyHomework.createdAt,
        groupName: groups.name,
        subjectName: subjects.name,
        submissionId: academyHomeworkSubmissions.id,
        submissionStatus: academyHomeworkSubmissions.status,
        submittedAt: academyHomeworkSubmissions.submittedAt,
        score: academyHomeworkCorrections.score,
        scoreMax: academyHomeworkCorrections.scoreMax,
        correctionComment: academyHomeworkCorrections.comment,
        correctedAt: academyHomeworkCorrections.correctedAt,
      })
      .from(academyHomework)
      .innerJoin(groups, eq(academyHomework.groupId, groups.id))
      .innerJoin(subjects, eq(academyHomework.subjectId, subjects.id))
      .leftJoin(
        academyHomeworkSubmissions,
        and(
          eq(academyHomeworkSubmissions.homeworkId, academyHomework.id),
          eq(academyHomeworkSubmissions.studentProfileId, profile.id),
        ),
      )
      .leftJoin(
        academyHomeworkCorrections,
        eq(academyHomeworkCorrections.submissionId, academyHomeworkSubmissions.id),
      )
      .where(eq(academyHomework.groupId, profile.primaryGroupId))
      .orderBy(desc(academyHomework.createdAt));

    return NextResponse.json(
      { data: { assignments } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const allowedGroups = await staffGroupIds(user.id, user.role);
  if (allowedGroups && allowedGroups.length === 0) {
    return NextResponse.json(
      { data: { assignments: [], submissions: [], files: [], scopes: [] } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const scopeQuery = db
    .selectDistinct({
      groupId: academyWeeklySessions.groupId,
      subjectId: academyWeeklySessions.subjectId,
      groupName: groups.name,
      subjectName: subjects.name,
    })
    .from(academyWeeklySessions)
    .innerJoin(groups, eq(academyWeeklySessions.groupId, groups.id))
    .innerJoin(subjects, eq(academyWeeklySessions.subjectId, subjects.id));

  const scopes =
    allowedGroups === null
      ? await scopeQuery.orderBy(asc(groups.name), asc(subjects.name))
      : await scopeQuery
          .where(inArray(academyWeeklySessions.groupId, allowedGroups))
          .orderBy(asc(groups.name), asc(subjects.name));

  const assignmentQuery = db
    .select({
      id: academyHomework.id,
      groupId: academyHomework.groupId,
      subjectId: academyHomework.subjectId,
      title: academyHomework.title,
      instructions: academyHomework.instructions,
      dueAt: academyHomework.dueAt,
      createdAt: academyHomework.createdAt,
      groupName: groups.name,
      subjectName: subjects.name,
    })
    .from(academyHomework)
    .innerJoin(groups, eq(academyHomework.groupId, groups.id))
    .innerJoin(subjects, eq(academyHomework.subjectId, subjects.id));

  const assignments =
    allowedGroups === null
      ? await assignmentQuery.orderBy(desc(academyHomework.createdAt))
      : await assignmentQuery
          .where(inArray(academyHomework.groupId, allowedGroups))
          .orderBy(desc(academyHomework.createdAt));

  const homeworkIds = assignments.map((row) => row.id);
  if (homeworkIds.length === 0) {
    return NextResponse.json(
      { data: { assignments, submissions: [], files: [], scopes } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const submissions = await db
    .select({
      id: academyHomeworkSubmissions.id,
      homeworkId: academyHomeworkSubmissions.homeworkId,
      status: academyHomeworkSubmissions.status,
      submittedAt: academyHomeworkSubmissions.submittedAt,
      studentProfileId: studentProfiles.id,
      studentName: users.fullName,
      studentCode: studentProfiles.studentCode,
      score: academyHomeworkCorrections.score,
      scoreMax: academyHomeworkCorrections.scoreMax,
      correctionComment: academyHomeworkCorrections.comment,
      correctedAt: academyHomeworkCorrections.correctedAt,
    })
    .from(academyHomeworkSubmissions)
    .innerJoin(
      studentProfiles,
      eq(academyHomeworkSubmissions.studentProfileId, studentProfiles.id),
    )
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .leftJoin(
      academyHomeworkCorrections,
      eq(academyHomeworkCorrections.submissionId, academyHomeworkSubmissions.id),
    )
    .where(inArray(academyHomeworkSubmissions.homeworkId, homeworkIds))
    .orderBy(asc(users.fullName));

  const submissionIds = submissions.map((row) => row.id);
  const files =
    submissionIds.length === 0
      ? []
      : await db
          .select({
            id: academyHomeworkFiles.id,
            submissionId: academyHomeworkFiles.submissionId,
            fileName: academyHomeworkFiles.fileName,
            mimeType: academyHomeworkFiles.mimeType,
            sizeBytes: academyHomeworkFiles.sizeBytes,
          })
          .from(academyHomeworkFiles)
          .where(inArray(academyHomeworkFiles.submissionId, submissionIds))
          .orderBy(asc(academyHomeworkFiles.createdAt));

  return NextResponse.json(
    { data: { assignments, submissions, files, scopes } },
    { headers: { "Cache-Control": "no-store" } },
  );
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

  const groupId = uuid(body.groupId);
  const subjectId = uuid(body.subjectId);
  const title = shortText(body.title, 180);
  const instructions =
    typeof body.instructions === "string" && body.instructions.trim().length <= 4000
      ? body.instructions.trim() || null
      : null;
  const dueAt =
    typeof body.dueAt === "string" && body.dueAt.trim()
      ? new Date(body.dueAt)
      : null;

  if (!groupId || !subjectId || !title || (dueAt && Number.isNaN(dueAt.getTime()))) {
    return errorResponse(400, "INVALID_HOMEWORK", "Group, subject and title are required.");
  }

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1);

  if (!group || !subject) {
    return errorResponse(404, "ACADEMIC_SCOPE_NOT_FOUND", "Group or subject not found.");
  }

  if (authorization.session.user.role === "TEACHER") {
    const [assigned] = await db
      .select({ id: academyWeeklySessions.id })
      .from(academyWeeklySessions)
      .where(
        and(
          eq(academyWeeklySessions.groupId, groupId),
          eq(academyWeeklySessions.teacherUserId, authorization.session.user.id),
        ),
      )
      .limit(1);
    if (!assigned) {
      return errorResponse(403, "GROUP_NOT_ASSIGNED", "This group is not assigned to this teacher.");
    }
  }

  const [record] = await db
    .insert(academyHomework)
    .values({
      groupId,
      subjectId,
      title,
      instructions,
      dueAt,
      createdByUserId: authorization.session.user.id,
    })
    .returning();

  return NextResponse.json(
    { data: { record } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
