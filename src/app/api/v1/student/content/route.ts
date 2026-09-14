import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chapters, courses, lessonProgress, lessons } from "@/db/content-schema";
import { studentProfiles, subjects } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import {
  getStudentSubscriptionAccess,
  type StudentAccessState,
} from "@/lib/subscriptions/student-access";

function errorResponse(status: number, code: string, message: string, subscriptionState?: StudentAccessState) {
  return NextResponse.json(
    { error: { code, message, subscriptionState } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function subscriptionError(state: Exclude<StudentAccessState, "ACTIVE">) {
  if (state === "PENDING") {
    return errorResponse(403, "SUBSCRIPTION_PENDING", "Subscription is waiting for activation.", state);
  }
  if (state === "SUSPENDED") {
    return errorResponse(403, "SUBSCRIPTION_SUSPENDED", "Subscription is suspended.", state);
  }
  if (state === "EXPIRED") {
    return errorResponse(403, "SUBSCRIPTION_EXPIRED", "Subscription has expired.", state);
  }
  return errorResponse(403, "SUBSCRIPTION_REQUIRED", "An active subscription is required.", state);
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeRequest(request, ["STUDENT"]);
  if (!authorization.ok) {
    return errorResponse(
      authorization.reason === "UNAUTHENTICATED" ? 401 : 403,
      authorization.reason,
      authorization.reason === "UNAUTHENTICATED" ? "Authentication required." : "Student access required.",
    );
  }

  const userId = authorization.session.user.id;
  const [profile] = await db
    .select({ levelId: studentProfiles.levelId, streamId: studentProfiles.streamId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return errorResponse(403, "STUDENT_PROFILE_REQUIRED", "Student academic profile is required.");
  }

  const access = await getStudentSubscriptionAccess(userId);
  if (access.state !== "ACTIVE") {
    return subscriptionError(access.state);
  }

  const streamCondition = profile.streamId
    ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId))
    : isNull(courses.streamId);

  const courseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      subjectId: courses.subjectId,
      subjectName: subjects.name,
      academicYearId: courses.academicYearId,
      levelId: courses.levelId,
      streamId: courses.streamId,
      publishedAt: courses.publishedAt,
    })
    .from(courses)
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(
      and(
        eq(courses.status, "PUBLISHED"),
        eq(courses.levelId, profile.levelId),
        inArray(courses.academicYearId, access.entitledAcademicYearIds),
        streamCondition,
      ),
    )
    .orderBy(asc(subjects.name), asc(courses.title));

  const courseIds = courseRows.map((course) => course.id);
  const chapterRows = courseIds.length
    ? await db
        .select()
        .from(chapters)
        .where(and(inArray(chapters.courseId, courseIds), eq(chapters.status, "PUBLISHED")))
        .orderBy(asc(chapters.position), asc(chapters.title))
    : [];

  const chapterIds = chapterRows.map((chapter) => chapter.id);
  const lessonRows = chapterIds.length
    ? await db
        .select()
        .from(lessons)
        .where(and(inArray(lessons.chapterId, chapterIds), eq(lessons.status, "PUBLISHED")))
        .orderBy(asc(lessons.position), asc(lessons.title))
    : [];

  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const progressRows = lessonIds.length
    ? await db
        .select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.studentId, userId), inArray(lessonProgress.lessonId, lessonIds)))
    : [];

  const completedLessons = progressRows.filter((row) => row.status === "COMPLETED").length;
  const startedLessons = progressRows.length;
  const totalLessons = lessonRows.length;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return NextResponse.json(
    {
      data: {
        subscriptionState: access.state,
        courses: courseRows,
        chapters: chapterRows,
        lessons: lessonRows,
        progress: progressRows,
        progressSummary: {
          totalLessons,
          startedLessons,
          completedLessons,
          percent,
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
