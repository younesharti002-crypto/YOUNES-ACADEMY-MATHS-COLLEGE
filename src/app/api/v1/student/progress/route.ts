import { and, eq, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chapters, courses, lessonProgress, lessons } from "@/db/content-schema";
import { studentProfiles } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROGRESS_STATUSES = ["STARTED", "COMPLETED"] as const;
type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isProgressStatus(value: unknown): value is ProgressStatus {
  return typeof value === "string" && (PROGRESS_STATUSES as readonly string[]).includes(value);
}

async function canAccessLesson(studentId: string, lessonId: string) {
  const [profile] = await db
    .select({ levelId: studentProfiles.levelId, streamId: studentProfiles.streamId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentId))
    .limit(1);

  if (!profile) return false;

  const access = await getStudentSubscriptionAccess(studentId);
  if (access.state !== "ACTIVE" || access.entitledAcademicYearIds.length === 0) return false;

  const streamCondition = profile.streamId
    ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId))
    : isNull(courses.streamId);

  const [row] = await db
    .select({ academicYearId: courses.academicYearId })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .where(
      and(
        eq(lessons.id, lessonId),
        eq(lessons.status, "PUBLISHED"),
        eq(chapters.status, "PUBLISHED"),
        eq(courses.status, "PUBLISHED"),
        eq(courses.levelId, profile.levelId),
        streamCondition,
      ),
    )
    .limit(1);

  return Boolean(row && access.entitledAcademicYearIds.includes(row.academicYearId));
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Student access required.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Invalid request body.");
  }

  const payload = body as { lessonId?: unknown; status?: unknown };
  if (typeof payload.lessonId !== "string" || !UUID_RE.test(payload.lessonId)) {
    return errorResponse(400, "INVALID_LESSON_ID", "A valid lesson id is required.");
  }
  if (!isProgressStatus(payload.status)) {
    return errorResponse(400, "INVALID_PROGRESS_STATUS", "Progress status must be STARTED or COMPLETED.");
  }

  const studentId = authorization.session.user.id;
  const lessonId = payload.lessonId;
  const allowed = await canAccessLesson(studentId, lessonId);
  if (!allowed) {
    return errorResponse(403, "LESSON_ACCESS_DENIED", "This lesson is not available for this student.");
  }

  const [existing] = await db
    .select({ id: lessonProgress.id, status: lessonProgress.status, startedAt: lessonProgress.startedAt, completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.studentId, studentId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);

  if (existing?.status === "COMPLETED" && payload.status === "STARTED") {
    return NextResponse.json(
      { data: existing },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date();
  const [saved] = await db
    .insert(lessonProgress)
    .values({
      studentId,
      lessonId,
      status: payload.status,
      startedAt: existing?.startedAt ?? now,
      completedAt: payload.status === "COMPLETED" ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.studentId, lessonProgress.lessonId],
      set: {
        status: payload.status,
        completedAt: payload.status === "COMPLETED" ? now : null,
        updatedAt: now,
      },
    })
    .returning({
      id: lessonProgress.id,
      lessonId: lessonProgress.lessonId,
      status: lessonProgress.status,
      startedAt: lessonProgress.startedAt,
      completedAt: lessonProgress.completedAt,
    });

  return NextResponse.json(
    { data: saved },
    { headers: { "Cache-Control": "no-store" } },
  );
}
