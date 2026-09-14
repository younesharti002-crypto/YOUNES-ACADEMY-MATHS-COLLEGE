import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, lessonProgress, lessons } from "@/db/content-schema";
import { studentProfiles } from "@/db/schema";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

export type StudentProgressSummary = {
  totalLessons: number;
  startedLessons: number;
  completedLessons: number;
  percent: number;
};

const EMPTY_PROGRESS: StudentProgressSummary = {
  totalLessons: 0,
  startedLessons: 0,
  completedLessons: 0,
  percent: 0,
};

export async function getStudentProgressSummary(studentId: string): Promise<StudentProgressSummary> {
  const [profile] = await db
    .select({ levelId: studentProfiles.levelId, streamId: studentProfiles.streamId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentId))
    .limit(1);

  if (!profile) return EMPTY_PROGRESS;

  const access = await getStudentSubscriptionAccess(studentId);
  if (access.state !== "ACTIVE" || access.entitledAcademicYearIds.length === 0) {
    return EMPTY_PROGRESS;
  }

  const streamCondition = profile.streamId
    ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId))
    : isNull(courses.streamId);

  const courseRows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(
      and(
        eq(courses.status, "PUBLISHED"),
        eq(courses.levelId, profile.levelId),
        inArray(courses.academicYearId, access.entitledAcademicYearIds),
        streamCondition,
      ),
    );

  const courseIds = courseRows.map((row) => row.id);
  if (courseIds.length === 0) return EMPTY_PROGRESS;

  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(inArray(chapters.courseId, courseIds), eq(chapters.status, "PUBLISHED")));

  const chapterIds = chapterRows.map((row) => row.id);
  if (chapterIds.length === 0) return EMPTY_PROGRESS;

  const lessonRows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(and(inArray(lessons.chapterId, chapterIds), eq(lessons.status, "PUBLISHED")));

  const lessonIds = lessonRows.map((row) => row.id);
  if (lessonIds.length === 0) return EMPTY_PROGRESS;

  const progressRows = await db
    .select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.studentId, studentId), inArray(lessonProgress.lessonId, lessonIds)));

  const completedLessons = progressRows.filter((row) => row.status === "COMPLETED").length;
  const startedLessons = progressRows.length;
  const totalLessons = lessonIds.length;

  return {
    totalLessons,
    startedLessons,
    completedLessons,
    percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
  };
}
