import { and, asc, eq, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { chapters, courses, lessonProgress, lessons } from "@/db/content-schema";
import { studentProfiles, subjects } from "@/db/schema";
import { LessonViewer } from "@/components/content/LessonViewer";
import { isLocale } from "@/i18n/config";
import { getAuthenticatedSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getStudentSubscriptionAccess } from "@/lib/subscriptions/student-access";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lang: string; courseId: string; lessonId: string }>;
}) {
  const { lang, courseId, lessonId } = await params;
  if (!isLocale(lang)) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) redirect(`/${lang}/login`);

  const session = await getAuthenticatedSession(token);
  if (!session || session.user.role !== "STUDENT") redirect(`/${lang}/login`);

  const [profile] = await db
    .select({ levelId: studentProfiles.levelId, streamId: studentProfiles.streamId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1);

  if (!profile) redirect(`/${lang}/courses`);

  const access = await getStudentSubscriptionAccess(session.user.id);
  if (access.state !== "ACTIVE" || access.entitledAcademicYearIds.length === 0) {
    redirect(`/${lang}/courses`);
  }

  const streamCondition = profile.streamId
    ? or(isNull(courses.streamId), eq(courses.streamId, profile.streamId))
    : isNull(courses.streamId);

  const [row] = await db
    .select({
      courseId: courses.id,
      courseTitle: courses.title,
      academicYearId: courses.academicYearId,
      subjectName: subjects.name,
      chapterId: chapters.id,
      chapterTitle: chapters.title,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      lessonSummary: lessons.summary,
      lessonVideoUrl: lessons.videoUrl,
      lessonPdfUrl: lessons.pdfUrl,
    })
    .from(lessons)
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .innerJoin(subjects, eq(courses.subjectId, subjects.id))
    .where(
      and(
        eq(courses.id, courseId),
        eq(lessons.id, lessonId),
        eq(courses.status, "PUBLISHED"),
        eq(chapters.status, "PUBLISHED"),
        eq(lessons.status, "PUBLISHED"),
        eq(courses.levelId, profile.levelId),
        streamCondition,
      ),
    )
    .limit(1);

  if (!row || !access.entitledAcademicYearIds.includes(row.academicYearId)) {
    notFound();
  }

  const chapterLessons = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .where(and(eq(lessons.chapterId, row.chapterId), eq(lessons.status, "PUBLISHED")))
    .orderBy(asc(lessons.position), asc(lessons.title));

  const [progress] = await db
    .select({ status: lessonProgress.status })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.studentId, session.user.id), eq(lessonProgress.lessonId, row.lessonId)))
    .limit(1);

  const currentIndex = chapterLessons.findIndex((item) => item.id === row.lessonId);
  const previousLesson = currentIndex > 0 ? chapterLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < chapterLessons.length - 1 ? chapterLessons[currentIndex + 1] : null;
  const initialProgressStatus = progress?.status === "COMPLETED"
    ? "COMPLETED"
    : progress?.status === "STARTED"
      ? "STARTED"
      : "NONE";

  return (
    <LessonViewer
      lang={lang}
      courseId={row.courseId}
      courseTitle={row.courseTitle}
      subjectName={row.subjectName}
      chapterTitle={row.chapterTitle}
      lesson={{
        id: row.lessonId,
        title: row.lessonTitle,
        summary: row.lessonSummary,
        videoUrl: row.lessonVideoUrl,
        pdfUrl: row.lessonPdfUrl,
      }}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
      initialProgressStatus={initialProgressStatus}
    />
  );
}
