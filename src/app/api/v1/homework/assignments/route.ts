import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  academyAssignments,
  academyCorrections,
  academySubmissions,
} from "@/db/academy-operations-schema";
import { academyWeeklySessions } from "@/db/academy-management-schema";
import { groups, studentProfiles, subjects } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { teacherCanAccessGroupSubject } from "@/lib/homework/access";

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

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= max ? cleaned : null;
}

function optionalDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, [
    "ADMIN",
    "TEACHER",
    "STUDENT",
  ]);

  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED"
        ? "Authentication required."
        : "Homework access denied.",
    );
  }

  const session = authorization.session;

  if (session.user.role === "STUDENT") {
    const [profile] = await db
      .select({
        id: studentProfiles.id,
        groupId: studentProfiles.primaryGroupId,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id))
      .limit(1);

    if (!profile?.groupId) {
      return NextResponse.json(
        { data: { assignments: [] } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const assignments = await db
      .select({
        id: academyAssignments.id,
        title: academyAssignments.title,
        instructions: academyAssignments.instructions,
        dueAt: academyAssignments.dueAt,
        createdAt: academyAssignments.createdAt,
        groupName: groups.name,
        subjectName: subjects.name,
      })
      .from(academyAssignments)
      .innerJoin(groups, eq(academyAssignments.groupId, groups.id))
      .innerJoin(subjects, eq(academyAssignments.subjectId, subjects.id))
      .where(
        and(
          eq(academyAssignments.groupId, profile.groupId),
          eq(academyAssignments.published, true),
        ),
      )
      .orderBy(desc(academyAssignments.createdAt));

    const studentSubmissions = await db
      .select({
        id: academySubmissions.id,
        assignmentId: academySubmissions.assignmentId,
        status: academySubmissions.status,
        submittedAt: academySubmissions.submittedAt,
        studentComment: academySubmissions.studentComment,
        score: academyCorrections.score,
        scoreMax: academyCorrections.scoreMax,
        correctionComment: academyCorrections.comment,
        correctedAt: academyCorrections.correctedAt,
      })
      .from(academySubmissions)
      .leftJoin(
        academyCorrections,
        eq(academyCorrections.submissionId, academySubmissions.id),
      )
      .where(eq(academySubmissions.studentProfileId, profile.id));

    const submissionByAssignment = new Map(
      studentSubmissions.map((row) => [row.assignmentId, row]),
    );

    const cleanAssignments = assignments.map((row) => {
      const submission = submissionByAssignment.get(row.id);
      return {
        ...row,
        submissionId: submission?.id ?? null,
        submissionStatus: submission?.status ?? null,
        submittedAt: submission?.submittedAt ?? null,
        studentComment: submission?.studentComment ?? null,
        score: submission?.score ?? null,
        scoreMax: submission?.scoreMax ?? null,
        correctionComment: submission?.correctionComment ?? null,
        correctedAt: submission?.correctedAt ?? null,
      };
    });

    return NextResponse.json(
      { data: { assignments: cleanAssignments } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let assignments;

  if (session.user.role === "ADMIN") {
    assignments = await db
      .select({
        id: academyAssignments.id,
        title: academyAssignments.title,
        instructions: academyAssignments.instructions,
        dueAt: academyAssignments.dueAt,
        published: academyAssignments.published,
        groupId: academyAssignments.groupId,
        groupName: groups.name,
        subjectId: academyAssignments.subjectId,
        subjectName: subjects.name,
        teacherUserId: academyAssignments.teacherUserId,
        createdAt: academyAssignments.createdAt,
      })
      .from(academyAssignments)
      .innerJoin(groups, eq(academyAssignments.groupId, groups.id))
      .innerJoin(subjects, eq(academyAssignments.subjectId, subjects.id))
      .orderBy(desc(academyAssignments.createdAt));
  } else {
    const groupRows = await db
      .select({ groupId: academyWeeklySessions.groupId })
      .from(academyWeeklySessions)
      .where(eq(academyWeeklySessions.teacherUserId, session.user.id));

    const groupIds = [...new Set(groupRows.map((row) => row.groupId))];

    assignments =
      groupIds.length > 0
        ? await db
            .select({
              id: academyAssignments.id,
              title: academyAssignments.title,
              instructions: academyAssignments.instructions,
              dueAt: academyAssignments.dueAt,
              published: academyAssignments.published,
              groupId: academyAssignments.groupId,
              groupName: groups.name,
              subjectId: academyAssignments.subjectId,
              subjectName: subjects.name,
              teacherUserId: academyAssignments.teacherUserId,
              createdAt: academyAssignments.createdAt,
            })
            .from(academyAssignments)
            .innerJoin(groups, eq(academyAssignments.groupId, groups.id))
            .innerJoin(subjects, eq(academyAssignments.subjectId, subjects.id))
            .where(
              or(
                eq(academyAssignments.teacherUserId, session.user.id),
                inArray(academyAssignments.groupId, groupIds),
              ),
            )
            .orderBy(desc(academyAssignments.createdAt))
        : await db
            .select({
              id: academyAssignments.id,
              title: academyAssignments.title,
              instructions: academyAssignments.instructions,
              dueAt: academyAssignments.dueAt,
              published: academyAssignments.published,
              groupId: academyAssignments.groupId,
              groupName: groups.name,
              subjectId: academyAssignments.subjectId,
              subjectName: subjects.name,
              teacherUserId: academyAssignments.teacherUserId,
              createdAt: academyAssignments.createdAt,
            })
            .from(academyAssignments)
            .innerJoin(groups, eq(academyAssignments.groupId, groups.id))
            .innerJoin(subjects, eq(academyAssignments.subjectId, subjects.id))
            .where(eq(academyAssignments.teacherUserId, session.user.id))
            .orderBy(desc(academyAssignments.createdAt));
  }

  const [allGroups, allSubjects] = await Promise.all([
    session.user.role === "ADMIN"
      ? db
          .select({ id: groups.id, name: groups.name })
          .from(groups)
          .where(eq(groups.active, true))
          .orderBy(asc(groups.name))
      : db
          .selectDistinct({ id: groups.id, name: groups.name })
          .from(groups)
          .innerJoin(
            academyWeeklySessions,
            eq(academyWeeklySessions.groupId, groups.id),
          )
          .where(eq(academyWeeklySessions.teacherUserId, session.user.id))
          .orderBy(asc(groups.name)),
    db
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .where(eq(subjects.active, true))
      .orderBy(asc(subjects.name)),
  ]);

  return NextResponse.json(
    { data: { assignments, groups: allGroups, subjects: allSubjects } },
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

  const groupId = uuid(body.groupId);
  const subjectId = uuid(body.subjectId);
  const title = text(body.title, 220);
  const instructions =
    body.instructions === null || body.instructions === ""
      ? null
      : text(body.instructions, 5000);
  const dueAt = optionalDate(body.dueAt);
  const published = body.published !== false;

  if (
    !groupId ||
    !subjectId ||
    !title ||
    dueAt === undefined ||
    (body.instructions && instructions === null)
  ) {
    return errorResponse(
      400,
      "INVALID_ASSIGNMENT",
      "Group, subject, title and valid optional instructions/due date are required.",
    );
  }

  const [[group], [subject]] = await Promise.all([
    db
      .select({ id: groups.id, active: groups.active })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1),
    db
      .select({ id: subjects.id, active: subjects.active })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1),
  ]);

  if (!group?.active || !subject?.active) {
    return errorResponse(
      404,
      "ACADEMIC_SCOPE_NOT_FOUND",
      "Group or subject not found.",
    );
  }

  const scopeConditions = [
    eq(academyWeeklySessions.groupId, groupId),
    eq(academyWeeklySessions.subjectId, subjectId),
  ] as const;

  const [scheduledScope] =
    authorization.session.user.role === "TEACHER"
      ? await db
          .select({ id: academyWeeklySessions.id })
          .from(academyWeeklySessions)
          .where(
            and(
              ...scopeConditions,
              eq(
                academyWeeklySessions.teacherUserId,
                authorization.session.user.id,
              ),
            ),
          )
          .limit(1)
      : await db
          .select({ id: academyWeeklySessions.id })
          .from(academyWeeklySessions)
          .where(and(...scopeConditions))
          .limit(1);

  if (!scheduledScope) {
    return errorResponse(
      403,
      "ACADEMIC_SCOPE_FORBIDDEN",
      "This group and subject pair is not available to this staff account.",
    );
  }

  const teacherUserId =
    authorization.session.user.role === "TEACHER"
      ? authorization.session.user.id
      : null;

  const [record] = await db
    .insert(academyAssignments)
    .values({
      groupId,
      subjectId,
      teacherUserId,
      createdByUserId: authorization.session.user.id,
      title,
      instructions,
      dueAt,
      published,
    })
    .returning();

  return NextResponse.json(
    { data: { record } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
