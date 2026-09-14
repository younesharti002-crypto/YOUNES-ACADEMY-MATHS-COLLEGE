import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { courses, liveClasses } from "@/db/content-schema";
import { studentProfiles, subjects } from "@/db/schema";
import { authorizeRequest } from "@/lib/auth/authorization";
import { sanitizeStudentLiveResources } from "@/lib/live/student-visibility";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
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
  if (!profile) return errorResponse(403, "STUDENT_PROFILE_REQUIRED", "Student academic profile is required.");

  const access = await getStudentSubscriptionAccess(userId);
  if (access.state !== "ACTIVE" || access.entitledAcademicYearIds.length === 0) {
    return errorResponse(403, `SUBSCRIPTION_${access.state === "NONE" ? "REQUIRED" : access.state}`, "An active subscription is required.");
  }

  const streamCondition = profile.streamId
    ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId))
    : isNull(courses.streamId);

  const courseRows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(
      eq(courses.status, "PUBLISHED"),
      eq(courses.levelId, profile.levelId),
      inArray(courses.academicYearId, access.entitledAcademicYearIds),
      streamCondition,
    ));

  const courseIds = courseRows.map((course) => course.id);
  const sessions = courseIds.length
    ? await db
        .select({
          id: liveClasses.id,
          courseId: liveClasses.courseId,
          courseTitle: courses.title,
          subjectName: subjects.name,
          title: liveClasses.title,
          description: liveClasses.description,
          scheduledAt: liveClasses.scheduledAt,
          durationMinutes: liveClasses.durationMinutes,
          joinUrl: liveClasses.joinUrl,
          replayUrl: liveClasses.replayUrl,
          replayPdfUrl: liveClasses.replayPdfUrl,
          status: liveClasses.status,
        })
        .from(liveClasses)
        .innerJoin(courses, eq(liveClasses.courseId, courses.id))
        .innerJoin(subjects, eq(courses.subjectId, subjects.id))
        .where(and(
          inArray(liveClasses.courseId, courseIds),
          inArray(liveClasses.status, ["SCHEDULED", "LIVE", "COMPLETED"]),
        ))
        .orderBy(asc(liveClasses.scheduledAt))
    : [];

  const visibleSessions = sessions.map(sanitizeStudentLiveResources);

  return NextResponse.json(
    { data: { subscriptionState: access.state, sessions: visibleSessions } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
